package main

import (
	"encoding/base64"

	"github.com/mr-tron/base58/base58"
)

// base58Encode encodes raw bytes (e.g. a 32-byte pubkey) to base58 string.
func base58Encode(b []byte) string {
	return base58.Encode(b)
}

// base58EncodeBytes is an alias used when the discriminator is passed as []byte.
func base58EncodeBytes(b []byte) string {
	return base58.Encode(b)
}

// base64Decode decodes a standard base64 string.
func base64Decode(s string) ([]byte, error) {
	return base64.StdEncoding.DecodeString(s)
}
