package proof

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const ReclaimBaseURL = "https://api.reclaimprotocol.org/api/v1"

type ReclaimProof struct {
	Identifier string            `json:"identifier"`
	ClaimData  ClaimData         `json:"claimData"`
	Signatures []string          `json:"signatures"`
	Witnesses  []WitnessData     `json:"witnesses"`
	PublicData map[string]string `json:"publicData"`
}

type ClaimData struct {
	Provider   string `json:"provider"`
	Parameters string `json:"parameters"`
	Owner      string `json:"owner"`
	TimestampS uint32 `json:"timestampS"`
	Context    string `json:"context"`
	Identifier string `json:"identifier"`
	Epoch      uint32 `json:"epoch"`
}

type WitnessData struct {
	ID  string `json:"id"`
	URL string `json:"url"`
}

type ReclaimClient struct {
	AppID     string
	AppSecret string
	Client    *http.Client
}

func NewReclaimClient(appID, appSecret string) *ReclaimClient {
	return &ReclaimClient{
		AppID:     appID,
		AppSecret: appSecret,
		Client:    &http.Client{Timeout: 30 * time.Second},
	}
}

func (r *ReclaimClient) IsConfigured() bool {
	return strings.TrimSpace(r.AppID) != "" && strings.TrimSpace(r.AppSecret) != ""
}

func (r *ReclaimClient) CreateVerificationRequest(trackingNumber, expectedStatus string) (string, string, error) {
	if !r.IsConfigured() {
		return "", "", fmt.Errorf("reclaim credentials are missing")
	}
	payload := map[string]any{
		"appId":             r.AppID,
		"providerId":        "dhl-tracking",
		"applicationSecret": r.AppSecret,
		"parameters": map[string]string{
			"trackingNumber": trackingNumber,
			"expectedStatus": expectedStatus,
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", "", err
	}

	resp, err := r.Client.Post(ReclaimBaseURL+"/verification/create", "application/json", bytes.NewReader(body))
	if err != nil {
		return "", "", fmt.Errorf("failed to create verification: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		raw, _ := io.ReadAll(resp.Body)
		return "", "", fmt.Errorf("create verification failed: %s (%s)", resp.Status, strings.TrimSpace(string(raw)))
	}

	var result struct {
		SessionID       string `json:"sessionId"`
		VerificationURL string `json:"verificationUrl"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", "", err
	}
	if result.SessionID == "" {
		return "", "", fmt.Errorf("missing sessionId in reclaim response")
	}
	return result.SessionID, result.VerificationURL, nil
}

func (r *ReclaimClient) PollForProof(ctx context.Context, sessionID string) (*ReclaimProof, error) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil, fmt.Errorf("timeout waiting for proof")
		case <-ticker.C:
			proof, done, err := r.checkProofStatus(sessionID)
			if err != nil {
				continue
			}
			if done {
				return proof, nil
			}
		}
	}
}

func (r *ReclaimClient) checkProofStatus(sessionID string) (*ReclaimProof, bool, error) {
	resp, err := r.Client.Get(ReclaimBaseURL + "/verification/" + sessionID + "/status")
	if err != nil {
		return nil, false, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		raw, _ := io.ReadAll(resp.Body)
		return nil, false, fmt.Errorf("status check failed: %s (%s)", resp.Status, strings.TrimSpace(string(raw)))
	}

	var result struct {
		Status string        `json:"status"`
		Proof  *ReclaimProof `json:"proof"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, false, err
	}
	if result.Status == "success" && result.Proof != nil {
		return result.Proof, true, nil
	}
	return nil, false, nil
}

func (r *ReclaimProof) SerializeForSolana() ([]byte, error) {
	data, err := json.Marshal(r)
	if err != nil {
		return nil, err
	}
	if len(data) < 32 {
		return nil, fmt.Errorf("proof too small: %d bytes", len(data))
	}
	return data, nil
}
