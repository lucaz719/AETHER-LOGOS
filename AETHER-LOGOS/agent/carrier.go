package main

import "fmt"

// statusProgression defines the lifecycle stages of a shipment.
var statusProgression = []string{
	"Picked Up",
	"In Transit",
	"Out for Delivery",
	"Delivered",
}

// FetchTrackingStatus queries the carrier API for the current status of a shipment.
// This is a mock implementation for the hackathon that cycles through statuses
// based on the shipment's current state. A production version would call
// DHL, FedEx, or UPS APIs via HTTP.
func FetchTrackingStatus(carrier, trackingID, currentStatus string) (string, error) {
	nextIndex := 0
	for i, s := range statusProgression {
		if s == currentStatus {
			nextIndex = i + 1
			break
		}
	}

	if nextIndex >= len(statusProgression) {
		return currentStatus, nil
	}

	_ = carrier    // would be used to select the real API endpoint
	_ = trackingID // would be passed to the real API call

	newStatus := statusProgression[nextIndex]
	fmt.Printf("[carrier] %s/%s: %q -> %q\n", carrier, trackingID, currentStatus, newStatus)
	return newStatus, nil
}
