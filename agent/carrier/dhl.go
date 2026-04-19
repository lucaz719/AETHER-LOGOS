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

type ShipmentStatus struct {
	TrackingNumber string
	Status         string
	Description    string
	Timestamp      time.Time
}

type dhlTrackingResponse struct {
	Shipments []struct {
		ID     string `json:"id"`
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
	if trackingNumber == "" {
		return nil, fmt.Errorf("tracking number is required")
	}
	endpoint := fmt.Sprintf("%s/shipments/%s/tracking", strings.TrimRight(c.BaseURL, "/"), url.PathEscape(trackingNumber))

	var (
		lastErr error
		result  *ShipmentStatus
	)
	backoff := 500 * time.Millisecond
	for attempt := 0; attempt < 3; attempt++ {
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
			lastErr = err
		} else {
			defer resp.Body.Close()
			if resp.StatusCode >= 500 {
				lastErr = fmt.Errorf("dhl server error: %s", resp.Status)
			} else if resp.StatusCode >= 400 {
				lastErr = fmt.Errorf("dhl request failed: %s", resp.Status)
			} else {
				var payload dhlTrackingResponse
				if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
					lastErr = err
				} else if len(payload.Shipments) == 0 {
					lastErr = fmt.Errorf("no shipment found in dhl response for %s", trackingNumber)
				} else {
					shipment := payload.Shipments[0]
					ts := time.Now().UTC()
					if shipment.Status.Timestamp != "" {
						if parsed, err := time.Parse(time.RFC3339, shipment.Status.Timestamp); err == nil {
							ts = parsed
						}
					}
					result = &ShipmentStatus{
						TrackingNumber: trackingNumber,
						Status:         mapDHLStatus(shipment.Status.Code),
						Description:    shipment.Status.Description,
						Timestamp:      ts,
					}
					lastErr = nil
				}
			}
		}
		if lastErr == nil {
			return result, nil
		}
		time.Sleep(backoff)
		backoff *= 2
	}
	return nil, lastErr
}

func mapDHLStatus(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "delivered":
		return "Delivered"
	case "exception":
		return "Exception"
	case "transit", "in_transit", "in-transit":
		return "InTransit"
	default:
		return "InTransit"
	}
}
