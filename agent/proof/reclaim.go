package proof

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"time"
)

type DeliveryProof struct {
	TrackingNumber string
	DeliveredAt    time.Time
	ProofBytes     []byte
	ProofHash      string
}

func GenerateDeliveryProof(trackingNumber string, deliveryData map[string]interface{}) (*DeliveryProof, error) {
	proofBytes, err := json.Marshal(deliveryData)
	if err != nil {
		return nil, err
	}
	sum := sha256.Sum256(proofBytes)
	return &DeliveryProof{
		TrackingNumber: trackingNumber,
		DeliveredAt:    time.Now().UTC(),
		ProofBytes:     proofBytes,
		ProofHash:      hex.EncodeToString(sum[:]),
	}, nil
}
