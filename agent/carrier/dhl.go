package carrier

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
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
	Shipments []struct {
		ID                string `json:"id"`
		EstimatedDelivery string `json:"estimatedDeliveryDate"`
		Events            []struct {
			Status      string `json:"statusCode"`
			Description string `json:"description"`
			Timestamp   string `json:"timestamp"`
			Location    string `json:"location"`
			SignedBy    string `json:"signedBy"`
		} `json:"events"`
		Status struct {
			Code        string `json:"statusCode"`
			Description string `json:"description"`
			Timestamp   string `json:"timestamp"`
		} `json:"status"`
	} `json:"shipments"`
}

func NewDHLClient(apiKey string) *DHLClient {
	return &DHLClient{
		APIKey:  apiKey,
		BaseURL: "https://api-mock.dhl.com/mydhl-api",
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
	endpoint := fmt.Sprintf(
		"%s/shipments/%s/tracking",
		strings.TrimRight(c.BaseURL, "/"),
		url.PathEscape(trackingNumber),
	)

	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	if c.APIKey != "" {
		req.Header.Set("DHL-API-Key", c.APIKey)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := c.Client.Do(req)
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
	hasSignature := false
	signedBy := ""
	for _, e := range shipment.Events {
		ts := time.Now().UTC()
		if e.Timestamp != "" {
			if parsed, parseErr := time.Parse(time.RFC3339, e.Timestamp); parseErr == nil {
				ts = parsed
			}
		}
		status := mapDHLStatus(e.Status)
		m := TrackingMilestone{
			Status:      status,
			Description: e.Description,
			Location:    e.Location,
			Timestamp:   ts,
			IsDelivered: strings.EqualFold(status, "Delivered"),
			SignedBy:    e.SignedBy,
		}
		if strings.TrimSpace(m.SignedBy) != "" {
			hasSignature = true
			signedBy = m.SignedBy
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
		milestones = append(milestones, TrackingMilestone{
			Status:      mapDHLStatus(shipment.Status.Code),
			Description: shipment.Status.Description,
			Timestamp:   ts,
			IsDelivered: strings.EqualFold(mapDHLStatus(shipment.Status.Code), "Delivered"),
		})
	}

	currentStatus := milestones[len(milestones)-1].Status
	var estimated *time.Time
	if shipment.EstimatedDelivery != "" {
		if parsed, parseErr := time.Parse(time.RFC3339, shipment.EstimatedDelivery); parseErr == nil {
			estimated = &parsed
		}
	}

	return &ShipmentTracking{
		TrackingNumber:    trackingNumber,
		CurrentStatus:     currentStatus,
		Milestones:        milestones,
		IsDelivered:       strings.EqualFold(currentStatus, "Delivered"),
		HasSignature:      hasSignature,
		SignedBy:          signedBy,
		EstimatedDelivery: estimated,
	}, nil
}

func mapDHLStatus(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "delivered":
		return "Delivered"
	case "exception":
		return "Exception"
	case "pickup", "picked_up":
		return "Picked Up"
	case "out_for_delivery", "out-for-delivery":
		return "Out for Delivery"
	case "transit", "in_transit", "in-transit":
		return "In Transit"
	default:
		return "In Transit"
	}
}
