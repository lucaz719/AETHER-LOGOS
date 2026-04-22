package carrier

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

type DHLClient struct {
	APIKey  string
	BaseURL string
	Client  *http.Client
}

type TrackingMilestone struct {
	Status      string    `json:"status"`
	Description string    `json:"description"`
	Location    string    `json:"location"`
	Timestamp   time.Time `json:"timestamp"`
	IsDelivered bool      `json:"isDelivered"`
	SignedBy    string    `json:"signedBy,omitempty"`
}

type ShipmentTracking struct {
	TrackingNumber    string              `json:"trackingNumber"`
	CurrentStatus     string              `json:"currentStatus"`
	Milestones        []TrackingMilestone `json:"milestones"`
	IsDelivered       bool                `json:"isDelivered"`
	HasSignature      bool                `json:"hasSignature"`
	SignedBy          string              `json:"signedBy"`
	EstimatedDelivery *time.Time          `json:"estimatedDelivery,omitempty"`
}

type ShipmentStatus struct {
	TrackingNumber string
	Status         string
	Description    string
	Timestamp      time.Time
}

type dhlTrackingResponse struct {
	Shipments []dhlShipment `json:"shipments"`
}

type dhlShipment struct {
	Status                  dhlStatus         `json:"status"`
	Events                  []dhlEvent        `json:"events"`
	EstimatedTimeOfDelivery string            `json:"estimatedTimeOfDelivery"`
	ProofOfDelivery         *dhlProofDelivery `json:"proofOfDelivery"`
}

type dhlProofDelivery struct {
	SignedBy string `json:"signedBy"`
}

type dhlStatus struct {
	Timestamp   string      `json:"timestamp"`
	Location    dhlLocation `json:"location"`
	Status      string      `json:"status"`
	Description string      `json:"description"`
}

type dhlEvent struct {
	Timestamp   string      `json:"timestamp"`
	Location    dhlLocation `json:"location"`
	Status      string      `json:"status"`
	Description string      `json:"description"`
}

type dhlLocation struct {
	Address dhlAddress `json:"address"`
	Name    string     `json:"name"`
}

type dhlAddress struct {
	AddressLocality string `json:"addressLocality"`
}

func NewDHLClient(apiKey string) *DHLClient {
	if strings.TrimSpace(apiKey) == "" {
		apiKey = os.Getenv("DHL_API_KEY")
	}
	baseURL := strings.TrimSpace(os.Getenv("DHL_BASE_URL"))
	if baseURL == "" {
		baseURL = "https://api-eu.dhl.com"
	}
	return &DHLClient{
		APIKey:  strings.TrimSpace(apiKey),
		BaseURL: strings.TrimRight(baseURL, "/"),
		Client:  &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *DHLClient) GetShipmentStatus(trackingNumber string) (*ShipmentStatus, error) {
	tracking, err := c.GetFullTracking(trackingNumber)
	if err != nil {
		return nil, err
	}
	ts := time.Now().UTC()
	if len(tracking.Milestones) > 0 {
		ts = tracking.Milestones[len(tracking.Milestones)-1].Timestamp
	}
	return &ShipmentStatus{
		TrackingNumber: tracking.TrackingNumber,
		Status:         tracking.CurrentStatus,
		Description:    tracking.CurrentStatus,
		Timestamp:      ts,
	}, nil
}

func (c *DHLClient) GetFullTracking(trackingNumber string) (*ShipmentTracking, error) {
	if strings.TrimSpace(trackingNumber) == "" {
		return nil, fmt.Errorf("tracking number is required")
	}
	baseURL := strings.TrimSpace(c.BaseURL)
	if baseURL == "" {
		baseURL = "https://api-eu.dhl.com"
	}
	endpoint := fmt.Sprintf("%s/track/shipments?trackingNumber=%s", strings.TrimRight(baseURL, "/"), url.QueryEscape(trackingNumber))

	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	apiKey := strings.TrimSpace(c.APIKey)
	if apiKey == "" {
		apiKey = strings.TrimSpace(os.Getenv("DHL_API_KEY"))
	}
	if apiKey != "" {
		req.Header.Set("DHL-API-Key", apiKey)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := c.doWithRetry(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("dhl request failed: %s", resp.Status)
	}

	var payload dhlTrackingResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	if len(payload.Shipments) == 0 {
		return nil, fmt.Errorf("no shipment found in dhl response for %s", trackingNumber)
	}

	shipment := payload.Shipments[0]
	milestones := make([]TrackingMilestone, 0, len(shipment.Events))
	signedBy := ""
	if shipment.ProofOfDelivery != nil {
		signedBy = strings.TrimSpace(shipment.ProofOfDelivery.SignedBy)
	}
	for _, e := range shipment.Events {
		ts := time.Now().UTC()
		if e.Timestamp != "" {
			if parsed, parseErr := time.Parse(time.RFC3339, e.Timestamp); parseErr == nil {
				ts = parsed
			}
		}
		status := mapDHLStatus(e.Status)
		location := strings.TrimSpace(e.Location.Address.AddressLocality)
		if location == "" {
			location = strings.TrimSpace(e.Location.Name)
		}
		m := TrackingMilestone{
			Status:      status,
			Description: e.Description,
			Location:    location,
			Timestamp:   ts,
			IsDelivered: strings.EqualFold(status, "Delivered"),
			SignedBy:    signedBy,
		}
		milestones = append(milestones, m)
	}
	if len(milestones) == 0 {
		ts := time.Now().UTC()
		if shipment.Status.Timestamp != "" {
			if parsed, parseErr := time.Parse(time.RFC3339, shipment.Status.Timestamp); parseErr == nil {
				ts = parsed
			}
		}
		status := mapDHLStatus(shipment.Status.Status)
		location := strings.TrimSpace(shipment.Status.Location.Address.AddressLocality)
		if location == "" {
			location = strings.TrimSpace(shipment.Status.Location.Name)
		}
		milestones = append(milestones, TrackingMilestone{
			Status:      status,
			Description: shipment.Status.Description,
			Location:    location,
			Timestamp:   ts,
			IsDelivered: strings.EqualFold(status, "Delivered"),
			SignedBy:    signedBy,
		})
	}

	currentStatus := mapDHLStatus(shipment.Status.Status)
	if strings.TrimSpace(currentStatus) == "" {
		currentStatus = milestones[len(milestones)-1].Status
	}
	var estimated *time.Time
	if shipment.EstimatedTimeOfDelivery != "" {
		if parsed, parseErr := time.Parse(time.RFC3339, shipment.EstimatedTimeOfDelivery); parseErr == nil {
			estimated = &parsed
		}
	}

	return &ShipmentTracking{
		TrackingNumber:    trackingNumber,
		CurrentStatus:     currentStatus,
		Milestones:        milestones,
		IsDelivered:       strings.EqualFold(currentStatus, "Delivered"),
		HasSignature:      signedBy != "",
		SignedBy:          signedBy,
		EstimatedDelivery: estimated,
	}, nil
}

func (c *DHLClient) doWithRetry(req *http.Request) (*http.Response, error) {
	delays := []time.Duration{0, 300 * time.Millisecond, 900 * time.Millisecond}
	var lastErr error
	for i, delay := range delays {
		if delay > 0 {
			time.Sleep(delay)
		}
		clonedReq := req.Clone(req.Context())
		resp, err := c.Client.Do(clonedReq)
		if err == nil {
			if resp.StatusCode < 500 {
				return resp, nil
			}
			lastErr = fmt.Errorf("dhl request failed: %s", resp.Status)
			resp.Body.Close()
		} else {
			lastErr = err
		}
		if i == len(delays)-1 || !isRetryable(lastErr) {
			break
		}
	}
	return nil, lastErr
}

func isRetryable(err error) bool {
	if err == nil {
		return false
	}
	if _, ok := err.(net.Error); ok {
		return true
	}
	return strings.Contains(strings.ToLower(err.Error()), "timeout") ||
		strings.Contains(strings.ToLower(err.Error()), "tempor") ||
		strings.Contains(strings.ToLower(err.Error()), "503") ||
		strings.Contains(strings.ToLower(err.Error()), "502") ||
		strings.Contains(strings.ToLower(err.Error()), "500")
}

func mapDHLStatus(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "pre-transit", "pre_transit":
		return "PendingPickup"
	case "out-for-delivery", "out_for_delivery":
		return "OutForDelivery"
	case "transit", "in_transit", "in-transit":
		return "InTransit"
	case "delivered":
		return "Delivered"
	case "failure", "exception":
		return "Exception"
	default:
		return "InTransit"
	}
}
