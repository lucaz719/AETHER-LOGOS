package main

import (
	"fmt"
	"log"
	"strings"
	"time"
)

// ┌─────────────────────────────────────────────────────────────┐
// │                 INSTITUTIONAL LOGGING UTILITIES             │
// └─────────────────────────────────────────────────────────────┘

const (
	// Progress indicators
	CheckMark  = "✓"
	ErrorMark  = "✗"
	InfoMark   = "ℹ"
	WarningMk  = "⚠"
	PendingMk  = "◇"
	CompleteMk = "◆"
)

// LogSection prints a prominent section header
func LogSection(title string) {
	fmt.Printf("\n┌─────────────────────────────────────────────────────────────┐\n")
	fmt.Printf("│ %-61s │\n", padCenter(title))
	fmt.Printf("└─────────────────────────────────────────────────────────────┘\n")
}

// LogStep logs a numbered step with status
func LogStep(step int, title string, status string) {
	symbol := "→"
	if strings.HasPrefix(status, "✓") {
		symbol = CheckMark
	} else if strings.HasPrefix(status, "✗") {
		symbol = ErrorMark
	} else if strings.HasPrefix(status, "◇") {
		symbol = PendingMk
	}

	fmt.Printf("  %s [%d] %-35s %s\n", symbol, step, title, status)
}

// LogProgress prints a progress bar with percentage
func LogProgress(label string, current, total int) {
	percent := (current * 100) / total
	barLength := 20
	filled := (percent * barLength) / 100

	bar := "["
	for i := 0; i < barLength; i++ {
		if i < filled {
			bar += "="
		} else if i == filled && percent > 0 && percent < 100 {
			bar += ">"
		} else {
			bar += "─"
		}
	}
	bar += "]"

	fmt.Printf("  %s %s %3d%% (%d/%d)\n", label, bar, percent, current, total)
}

// LogTransaction logs shipment processing with full details
func LogTransaction(trackingID string, status string, details string) {
	timestamp := time.Now().Format("15:04:05")
	fmt.Printf("  [%s] %s | %s | %s\n", timestamp, trackingID, status, details)
}

// LogDeliveryFlow logs the complete delivery + proof flow
func LogDeliveryFlow(trackingID, carrier, currentStatus string) {
	fmt.Printf("\n  ┌─ DELIVERY FLOW ──────────────────────────────────────\n")
	fmt.Printf("  │ Tracking: %s\n", trackingID)
	fmt.Printf("  │ Carrier:  %s\n", carrier)
	fmt.Printf("  │ Status:   %s\n", currentStatus)
	fmt.Printf("  ├─ VERIFICATION STEPS:\n")
}

// LogVerificationStep logs each step of verification
func LogVerificationStep(stepNum int, stepName string, result string) {
	status := "✓"
	if strings.Contains(result, "error") || strings.Contains(result, "failed") {
		status = "✗"
	}

	fmt.Printf("  │  %s [%d] %-20s → %s\n", status, stepNum, stepName, result)
}

// LogProofGenerated logs successful proof generation
func LogProofGenerated(trackingID, proofHash, txSig string) {
	fmt.Printf("  │\n")
	fmt.Printf("  │ PROOF GENERATED\n")
	fmt.Printf("  │   Hash: %s\n", truncateHash(proofHash))
	fmt.Printf("  │   TX Signature: %s\n", truncateHash(txSig))
	fmt.Printf("  └──────────────────────────────────────────────────────\n\n")
}

// LogPollSummary logs the poll cycle summary
func LogPollSummary(checked, updated, errors int) {
	fmt.Printf("┌─────────────────────────────────────────────────────────────┐\n")
	fmt.Printf("│ POLL CYCLE COMPLETE                                         │\n")
	fmt.Printf("├─────────────────────────────────────────────────────────────┤\n")
	fmt.Printf("│  Checked: %-5d   Updated: %-5d   Errors: %-5d          │\n", checked, updated, errors)
	fmt.Printf("└─────────────────────────────────────────────────────────────┘\n")
}

// LogError logs an error in an institutional format
func LogError(context string, err error) {
	timestamp := time.Now().Format("15:04:05")
	fmt.Printf("\n  [%s] %s ✗ ERROR\n", timestamp, context)
	fmt.Printf("  └─ %v\n\n", err)
	log.Printf("ERROR [%s]: %v", context, err)
}

// Helper functions
func padCenter(text string) string {
	padding := (61 - len(text)) / 2
	return strings.Repeat(" ", padding) + text + strings.Repeat(" ", 61-len(text)-padding)
}

func truncateHash(hash string) string {
	if len(hash) > 16 {
		return hash[:8] + "..." + hash[len(hash)-8:]
	}
	return hash
}

// LogInitialization logs agent startup
func LogInitialization(port string, mockProof bool, hasOnChainKey bool) {
	fmt.Printf("\n")
	fmt.Printf("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n")
	fmt.Printf("┃ AETHER-LOGOS SETTLEMENT AGENT                           ┃\n")
	fmt.Printf("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n")

	fmt.Printf("  Configuration:\n")
	fmt.Printf("    ✓ Listen Port: %s\n", port)

	if mockProof {
		fmt.Printf("    ◇ Mock Mode: ENABLED (zkTLS mocked)\n")
	} else {
		fmt.Printf("    ℹ Live Mode: ENABLED (real Reclaim Protocol)\n")
	}

	if hasOnChainKey {
		fmt.Printf("    ✓ On-Chain Submission: ENABLED\n")
	} else {
		fmt.Printf("    ◇ On-Chain Submission: DISABLED (offchain-only mode)\n")
	}

	fmt.Printf("\n  Ready for transactions. Waiting for shipments...\n\n")
}
