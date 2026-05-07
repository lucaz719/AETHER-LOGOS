package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/aether-logos/agent/carrier"
	"github.com/aether-logos/agent/proof"
	"github.com/gagliardetto/solana-go"
)

type registerRequest struct {
	TrackingID   string `json:"tracking_id"`
	Wallet       string `json:"wallet"`
	CallbackURL  string `json:"callback_url"`
	Carrier      string `json:"carrier"`
	TradeAccount string `json:"trade_account"`
	TradeID      string `json:"trade_id"`
}

type registerResponse struct {
	ID         int64  `json:"id"`
	TrackingID string `json:"tracking_id"`
	Status     string `json:"status"`
}

type notifyPayload struct {
	TrackingID string `json:"tracking_id"`
	Wallet     string `json:"wallet"`
	Carrier    string `json:"carrier"`
	OldStatus  string `json:"old_status"`
	NewStatus  string `json:"new_status"`
	Timestamp  string `json:"timestamp"`
}

type pollResult struct {
	Checked int            `json:"checked"`
	Updated int            `json:"updated"`
	Errors  int            `json:"errors"`
	Changes []statusChange `json:"changes,omitempty"`
}

type statusChange struct {
	TrackingID string `json:"tracking_id"`
	OldStatus  string `json:"old_status"`
	NewStatus  string `json:"new_status"`
}

type trackingResponse struct {
	Shipment   *Shipment                 `json:"shipment"`
	Tracking   *carrier.ShipmentTracking `json:"tracking"`
	Milestones []ShipmentMilestone       `json:"milestones"`
}

func runPollCycle() (pollResult, error) {
	shipments, err := GetPendingShipments()
	if err != nil {
		return pollResult{}, err
	}

	if len(shipments) == 0 {
		return pollResult{Checked: 0}, nil
	}

	// Log poll cycle start
	LogSection("POLL CYCLE START")
	LogProgress("Processing", 0, len(shipments))

	result := pollResult{Checked: len(shipments)}
	for idx, s := range shipments {
		if !strings.EqualFold(s.Carrier, "dhl") {
			continue
		}

		fullTracking, err := dhlClient.GetFullTracking(s.TrackingID)
		if err != nil {
			LogError(fmt.Sprintf("DHL lookup: %s", s.TrackingID), err)
			result.Errors++
			continue
		}

		milestones := make([]ShipmentMilestone, 0, len(fullTracking.Milestones))
		for _, m := range fullTracking.Milestones {
			milestones = append(milestones, ShipmentMilestone{
				Status:      m.Status,
				Description: m.Description,
				Location:    m.Location,
				Timestamp:   m.Timestamp.UTC().Unix(),
			})
		}
		if err := UpsertMilestones(s.ID, milestones); err != nil {
			LogError(fmt.Sprintf("Store milestones: %s", s.TrackingID), err)
			result.Errors++
		}

		newStatus := fullTracking.CurrentStatus
		if newStatus != s.LastKnownStatus {
			if err := UpdateStatus(s.ID, newStatus); err != nil {
				LogError(fmt.Sprintf("Update status: %s", s.TrackingID), err)
				result.Errors++
				continue
			}
			result.Updated++
			result.Changes = append(result.Changes, statusChange{
				TrackingID: s.TrackingID,
				OldStatus:  s.LastKnownStatus,
				NewStatus:  newStatus,
			})
			go sendNotification(s, newStatus)
		}

		if strings.EqualFold(newStatus, "delivered") {
			LogDeliveryFlow(s.TrackingID, s.Carrier, newStatus)
			
			// Get location from latest milestone
			location := "Unknown"
			if len(fullTracking.Milestones) > 0 {
				location = fullTracking.Milestones[len(fullTracking.Milestones)-1].Location
			}
			LogVerificationStep(1, "DHL Verification", fmt.Sprintf("✓ Delivered (%s)", location))

			if !fullTracking.HasSignature {
				if deliveredBeyondRetryWindow(s.UpdatedAt) {
					LogVerificationStep(0, "Signature Check", "✗ No signature (timeout)")
				}
				continue
			}

			if err := handleDeliveryConfirmed(s, fullTracking); err != nil {
				LogError(fmt.Sprintf("Delivery confirmation: %s", s.TrackingID), err)
				result.Errors++
				continue
			}
		}

		LogProgress("Processing", idx+1, len(shipments))
	}

	LogPollSummary(result.Checked, result.Updated, result.Errors)
	return result, nil
}

func handleDeliveryConfirmed(shipment Shipment, tracking *carrier.ShipmentTracking) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	if reclaimClient == nil || !reclaimClient.IsConfigured() {
		LogVerificationStep(2, "zkTLS Generation", "Fallback to SHA256")
		return handleDeliveryFallback(ctx, shipment, tracking)
	}

	LogVerificationStep(2, "zkTLS Generation", "Starting...")

	sessionID, verificationURL, err := reclaimClient.CreateVerificationRequest(
		shipment.TrackingID,
		"delivered",
	)
	if err != nil {
		LogVerificationStep(2, "zkTLS Generation", fmt.Sprintf("✗ Error: %v", err))
		return handleDeliveryFallback(ctx, shipment, tracking)
	}

	log.Printf("reclaim verification URL: %s", verificationURL)
	proofObj, err := reclaimClient.PollForProof(ctx, sessionID)
	if err != nil {
		LogError("Proof generation", err)
		return fmt.Errorf("proof generation failed: %w", err)
	}

	LogVerificationStep(2, "zkTLS Generation", "✓ Proof created")

	proofBytes, err := proofObj.SerializeForSolana()
	if err != nil {
		return err
	}

	txSig := "offchain-only"
	if solanaSubmitter != nil && shipment.TradeAccount != "" && shipment.TradeID != "" {
		LogVerificationStep(3, "On-Chain Submission", "Processing...")
		// Validate trade account is a valid base58-encoded pubkey before attempting submission
		tradeAccount, err := solana.PublicKeyFromBase58(shipment.TradeAccount)
		if err != nil {
			LogVerificationStep(3, "On-Chain Submission", fmt.Sprintf("⚠ Skipped (%v)", err))
			txSig = "offchain-only (invalid-key)"
		} else {
			tradeID, err := parseTradeIDHex(shipment.TradeID)
			if err != nil {
				return err
			}
			txSig, err = solanaSubmitter.SubmitReclaimProof(ctx, tradeAccount, tradeID, proofObj)
			if err != nil {
				LogError("On-chain submission", err)
				return fmt.Errorf("on-chain submission failed: %w", err)
			}
			LogVerificationStep(3, "On-Chain Submission", fmt.Sprintf("✓ Submitted (sig: %s)", truncateHash(txSig)))
		}
	}

	proofHash := fmt.Sprintf("%x", sha256.Sum256(proofBytes))
	if err := UpdateShipmentProof(shipment.ID, proofHash, txSig); err != nil {
		return err
	}

	LogProofGenerated(shipment.TrackingID, proofHash, txSig)
	log.Printf("zkTLS proof submitted: %s", txSig)
	return nil
}

func handleDeliveryFallback(ctx context.Context, shipment Shipment, tracking *carrier.ShipmentTracking) error {
	deliveryData := map[string]any{
		"tracking_number": shipment.TrackingID,
		"carrier":         shipment.Carrier,
		"status":          tracking.CurrentStatus,
		"signed_by":       tracking.SignedBy,
		"timestamp":       time.Now().UTC().Format(time.RFC3339),
	}
	deliveryProof, err := proof.GenerateDeliveryProof(shipment.TrackingID, deliveryData)
	if err != nil {
		return err
	}

	txSig := "offchain-only"
	if solanaSubmitter != nil && shipment.TradeAccount != "" && shipment.TradeID != "" {
		tradeAccount, err := solana.PublicKeyFromBase58(shipment.TradeAccount)
		if err != nil {
			return err
		}
		tradeID, err := parseTradeIDHex(shipment.TradeID)
		if err != nil {
			return err
		}
		sig, err := solanaSubmitter.SubmitProof(ctx, tradeAccount, tradeID, deliveryProof.ProofBytes)
		if err != nil {
			return err
		}
		txSig = sig.String()
	}

	return UpdateShipmentProof(shipment.ID, deliveryProof.ProofHash, txSig)
}

func deliveredBeyondRetryWindow(updatedAt string) bool {
	parsed, err := parseTimeLoose(updatedAt)
	if err != nil {
		return false
	}
	return time.Since(parsed) > 2*time.Hour
}

func parseTimeLoose(raw string) (time.Time, error) {
	layouts := []string{time.RFC3339, "2006-01-02 15:04:05", time.RFC3339Nano}
	for _, layout := range layouts {
		if ts, err := time.Parse(layout, raw); err == nil {
			return ts, nil
		}
	}
	return time.Time{}, fmt.Errorf("unsupported timestamp format")
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}
	if req.TrackingID == "" || req.Wallet == "" || req.CallbackURL == "" || req.Carrier == "" {
		http.Error(w, "tracking_id, wallet, callback_url, and carrier are required", http.StatusBadRequest)
		return
	}

	id, err := RegisterShipment(req.TrackingID, req.Wallet, req.CallbackURL, req.Carrier, req.TradeAccount, req.TradeID)
	if err != nil {
		log.Printf("register error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(registerResponse{ID: id, TrackingID: req.TrackingID, Status: "registered"})
}

func PollHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	result, err := runPollCycle()
	if err != nil {
		log.Printf("poll error fetching shipments: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func NotifyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var payload notifyPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}
	if payload.TrackingID == "" {
		http.Error(w, "tracking_id is required", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "notified"})
}

func TrackingHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	const prefix = "/api/tracking/"
	if !strings.HasPrefix(r.URL.Path, prefix) {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	trackingNumber := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, prefix))
	if trackingNumber == "" {
		http.Error(w, "tracking number is required", http.StatusBadRequest)
		return
	}

	shipment, err := GetShipmentByTrackingID(trackingNumber)
	if err != nil {
		http.Error(w, "shipment not found", http.StatusNotFound)
		return
	}
	respondWithTracking(w, shipment)
}

func TrackingByTradeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	const prefix = "/api/tracking/trade/"
	if !strings.HasPrefix(r.URL.Path, prefix) {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	tradeAccount := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, prefix))
	if tradeAccount == "" {
		http.Error(w, "trade account is required", http.StatusBadRequest)
		return
	}

	shipment, err := GetShipmentByTradeAccount(tradeAccount)
	if err != nil {
		http.Error(w, "shipment not found for this trade", http.StatusNotFound)
		return
	}
	respondWithTracking(w, shipment)
}

func respondWithTracking(w http.ResponseWriter, shipment *Shipment) {
	fullTracking, err := dhlClient.GetFullTracking(shipment.TrackingID)
	if err != nil {
		// If DHL lookup fails (e.g. invalid key), we still return the milestones from DB
		log.Printf("DHL lookup failed for %s: %v", shipment.TrackingID, err)
	}
	milestones, err := GetMilestonesByShipmentID(shipment.ID)
	if err != nil {
		http.Error(w, "milestone lookup failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(trackingResponse{
		Shipment:   shipment,
		Tracking:   fullTracking,
		Milestones: milestones,
	})
}

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func sendNotification(s Shipment, newStatus string) {
	payload := notifyPayload{
		TrackingID: s.TrackingID,
		Wallet:     s.Wallet,
		Carrier:    s.Carrier,
		OldStatus:  s.LastKnownStatus,
		NewStatus:  newStatus,
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
	}

	body, err := json.Marshal(payload)
	if err != nil {
		log.Printf("notify marshal error for %s: %v", s.TrackingID, err)
		return
	}
	resp, err := http.Post(s.CallbackURL, "application/json", bytes.NewReader(body))
	if err != nil {
		log.Printf("notify error for %s -> %s: %v", s.TrackingID, s.CallbackURL, err)
		return
	}
	defer resp.Body.Close()
	fmt.Printf("[notify] %s -> %s  status=%d\n", s.TrackingID, s.CallbackURL, resp.StatusCode)
}

func parseTradeIDHex(value string) ([32]byte, error) {
	var out [32]byte
	raw, err := hex.DecodeString(strings.TrimPrefix(strings.TrimSpace(value), "0x"))
	if err != nil {
		return out, err
	}
	if len(raw) != 32 {
		return out, fmt.Errorf("trade_id must be 32 bytes (64 hex chars), got %d bytes", len(raw))
	}
	copy(out[:], raw)
	return out, nil
}

// Vendor API Handlers
func VendorRegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodOptions {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req struct {
		Wallet      string `json:"wallet"`
		ShopName    string `json:"shop_name"`
		Description string `json:"description"`
		VendorType  string `json:"vendor_type"`
		Categories  string `json:"categories"`
		EmailHash   string `json:"email_hash"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	if req.Wallet == "" || req.ShopName == "" {
		http.Error(w, "wallet and shop_name are required", http.StatusBadRequest)
		return
	}

	id, err := RegisterVendor(req.Wallet, req.ShopName, req.Description, req.VendorType, req.Categories, req.EmailHash)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			http.Error(w, "vendor already registered", http.StatusConflict)
			return
		}
		log.Printf("vendor register error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"vendor_id": id,
		"wallet":    req.Wallet,
	})
}

func VendorGetHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodOptions {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	const prefix = "/api/vendor/"
	if !strings.HasPrefix(r.URL.Path, prefix) {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	wallet := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, prefix))
	if wallet == "" {
		http.Error(w, "wallet is required", http.StatusBadRequest)
		return
	}

	vendor, err := GetVendorByWallet(wallet)
	if err != nil {
		http.Error(w, "vendor not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(vendor)
}

// Product API Handlers
func ProductCreateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodOptions {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req struct {
		VendorWallet     string  `json:"vendor_wallet"`
		Title            string  `json:"title"`
		Description      string  `json:"description"`
		ShortDescription string  `json:"short_description"`
		PriceUsdc        float64 `json:"price_usdc"`
		Category         string  `json:"category"`
		ImageUrl         string  `json:"image_url"`
		MOQ              int64   `json:"moq"`
		LeadTimeDays     int64   `json:"lead_time_days"`
		Rating           float64 `json:"rating"`
		SellerTier       string  `json:"seller_tier"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	if req.VendorWallet == "" || req.Title == "" || req.PriceUsdc <= 0 {
		http.Error(w, "vendor_wallet, title, and price_usdc are required", http.StatusBadRequest)
		return
	}

	if req.MOQ <= 0 {
		req.MOQ = 1
	}
	if req.LeadTimeDays <= 0 {
		req.LeadTimeDays = 7
	}
	if req.Rating <= 0 {
		req.Rating = 4.5
	}
	if req.SellerTier == "" {
		req.SellerTier = "wholesaler"
	}
	id, err := CreateProduct(
		req.VendorWallet,
		req.Title,
		req.Description,
		req.ShortDescription,
		req.PriceUsdc,
		req.Category,
		req.ImageUrl,
		req.MOQ,
		req.LeadTimeDays,
		req.Rating,
		req.SellerTier,
	)
	if err != nil {
		log.Printf("product create error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":    true,
		"product_id": id,
	})
}

func ProductsListHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodOptions {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	category := r.URL.Query().Get("category")
	search := r.URL.Query().Get("search")
	vendor := r.URL.Query().Get("vendor")

	var products []Product
	var err error

	if search != "" {
		products, err = SearchProducts(search)
	} else if category != "" {
		products, err = GetProductsByCategory(category)
	} else if vendor != "" {
		products, err = GetProductsByVendor(vendor)
	} else {
		products, err = GetAllProducts()
	}

	if err != nil {
		log.Printf("products list error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	if products == nil {
		products = []Product{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"products": products,
		"count":    len(products),
	})
}

func ProductGetHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodOptions {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	const prefix = "/api/products/"
	if !strings.HasPrefix(r.URL.Path, prefix) {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	idStr := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, prefix))
	if idStr == "" {
		http.Error(w, "product id is required", http.StatusBadRequest)
		return
	}

	var id int64
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		http.Error(w, "invalid product id", http.StatusBadRequest)
		return
	}

	product, err := GetProductByID(id)
	if err != nil {
		http.Error(w, "product not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(product)
}
