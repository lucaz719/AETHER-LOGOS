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

	result := pollResult{Checked: len(shipments)}
	for _, s := range shipments {
		if !strings.EqualFold(s.Carrier, "dhl") {
			continue
		}

		fullTracking, err := dhlClient.GetFullTracking(s.TrackingID)
		if err != nil {
			log.Printf("poll error for %s: %v", s.TrackingID, err)
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
			log.Printf("milestone store error for %s: %v", s.TrackingID, err)
			result.Errors++
		}

		newStatus := fullTracking.CurrentStatus
		if newStatus != s.LastKnownStatus {
			if err := UpdateStatus(s.ID, newStatus); err != nil {
				log.Printf("poll update error for %s: %v", s.TrackingID, err)
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
			if !fullTracking.HasSignature {
				if deliveredBeyondRetryWindow(s.UpdatedAt) {
					log.Printf("delivery signature timeout for %s", s.TrackingID)
				}
				continue
			}
			if err := handleDeliveryConfirmed(s, fullTracking); err != nil {
				log.Printf("delivery handling failed for %s: %v", s.TrackingID, err)
				result.Errors++
				continue
			}
		}
	}

	return result, nil
}

func handleDeliveryConfirmed(shipment Shipment, tracking *carrier.ShipmentTracking) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	if reclaimClient == nil || !reclaimClient.IsConfigured() {
		return handleDeliveryFallback(ctx, shipment, tracking)
	}

	sessionID, verificationURL, err := reclaimClient.CreateVerificationRequest(
		shipment.TrackingID,
		"delivered",
	)
	if err != nil {
		log.Printf("reclaim unavailable, fallback to SHA256: %v", err)
		return handleDeliveryFallback(ctx, shipment, tracking)
	}

	log.Printf("reclaim verification URL: %s", verificationURL)
	proofObj, err := reclaimClient.PollForProof(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("proof generation failed: %w", err)
	}
	proofBytes, err := proofObj.SerializeForSolana()
	if err != nil {
		return err
	}

	txSig := "offchain-only"
	if solanaSubmitter != nil && shipment.TradeAccount != "" && shipment.TradeID != "" {
		tradeAccount := solana.MustPublicKeyFromBase58(shipment.TradeAccount)
		tradeID, err := parseTradeIDHex(shipment.TradeID)
		if err != nil {
			return err
		}
		txSig, err = solanaSubmitter.SubmitReclaimProof(ctx, tradeAccount, tradeID, proofObj)
		if err != nil {
			return fmt.Errorf("on-chain submission failed: %w", err)
		}
	}

	proofHash := fmt.Sprintf("%x", sha256.Sum256(proofBytes))
	if err := UpdateShipmentProof(shipment.ID, proofHash, txSig); err != nil {
		return err
	}
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
	fullTracking, err := dhlClient.GetFullTracking(trackingNumber)
	if err != nil {
		http.Error(w, "tracking lookup failed", http.StatusBadGateway)
		return
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
