package main

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/aether-logos/agent/proof"
	"github.com/gagliardetto/solana-go"
)

// registerRequest is the JSON body for POST /register.
type registerRequest struct {
	TrackingID   string `json:"tracking_id"`
	Wallet       string `json:"wallet"`
	CallbackURL  string `json:"callback_url"`
	Carrier      string `json:"carrier"`
	TradeAccount string `json:"trade_account"`
	TradeID      string `json:"trade_id"`
}

// registerResponse is returned after a successful registration.
type registerResponse struct {
	ID         int64  `json:"id"`
	TrackingID string `json:"tracking_id"`
	Status     string `json:"status"`
}

// notifyPayload is the webhook body sent to the merchant's callback URL.
type notifyPayload struct {
	TrackingID string `json:"tracking_id"`
	Wallet     string `json:"wallet"`
	Carrier    string `json:"carrier"`
	OldStatus  string `json:"old_status"`
	NewStatus  string `json:"new_status"`
	Timestamp  string `json:"timestamp"`
}

// pollResult summarises what happened during a poll cycle.
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

func runPollCycle() (pollResult, error) {
	shipments, err := GetPendingShipments()
	if err != nil {
		return pollResult{}, err
	}

	result := pollResult{Checked: len(shipments)}
	for _, s := range shipments {
		var newStatus string
		if strings.EqualFold(s.Carrier, "dhl") {
			status, err := dhlClient.GetShipmentStatus(s.TrackingID)
			if err != nil {
				log.Printf("poll error for %s: %v", s.TrackingID, err)
				result.Errors++
				continue
			}
			newStatus = status.Status
		} else {
			newStatus = s.LastKnownStatus
		}

		if newStatus == s.LastKnownStatus {
			continue
		}

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

		// Fire-and-forget notification to the merchant.
		go sendNotification(s, newStatus)

		if strings.EqualFold(newStatus, "delivered") {
			deliveryData := map[string]interface{}{
				"tracking_number": s.TrackingID,
				"carrier":         s.Carrier,
				"status":          newStatus,
				"timestamp":       time.Now().UTC().Format(time.RFC3339),
			}
			deliveryProof, err := proof.GenerateDeliveryProof(s.TrackingID, deliveryData)
			if err != nil {
				log.Printf("proof generation error for %s: %v", s.TrackingID, err)
				result.Errors++
				continue
			}
			if err := StoreProofHash(s.ID, deliveryProof.ProofHash); err != nil {
				log.Printf("proof_hash store error for %s: %v", s.TrackingID, err)
				result.Errors++
				continue
			}

			if solanaSubmitter != nil && s.TradeAccount != "" && s.TradeID != "" {
				tradeAccount, err := solana.PublicKeyFromBase58(s.TradeAccount)
				if err != nil {
					log.Printf("invalid trade account for %s: %v", s.TrackingID, err)
					result.Errors++
					continue
				}
				tradeID, err := parseTradeIDHex(s.TradeID)
				if err != nil {
					log.Printf("invalid trade_id for %s: %v", s.TrackingID, err)
					result.Errors++
					continue
				}
				if _, err := solanaSubmitter.SubmitProof(context.Background(), tradeAccount, tradeID, deliveryProof.ProofBytes); err != nil {
					log.Printf("solana submit_proof failed for %s: %v", s.TrackingID, err)
					result.Errors++
					continue
				}
			}
		}
	}

	return result, nil
}

// RegisterHandler handles POST /register.
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

	resp := registerResponse{ID: id, TrackingID: req.TrackingID, Status: "registered"}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(resp)
}

// PollHandler handles GET /poll – iterates pending shipments, checks for
// status changes, and triggers notifications when a change is detected.
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

// NotifyHandler handles POST /notify – sends a webhook to the specified callback URL.
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

// HealthHandler handles GET /health.
func HealthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// sendNotification posts the status change to the merchant's callback URL.
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

func parseTradeIDHex(value string) ([16]byte, error) {
	var out [16]byte
	raw, err := hex.DecodeString(strings.TrimPrefix(strings.TrimSpace(value), "0x"))
	if err != nil {
		return out, err
	}
	if len(raw) != 16 {
		return out, fmt.Errorf("trade_id must be 16 bytes (32 hex chars), got %d bytes", len(raw))
	}
	copy(out[:], raw)
	return out, nil
}
