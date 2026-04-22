package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/aether-logos/agent/carrier"
	"github.com/aether-logos/agent/proof"
)

var (
	dhlClient       *carrier.DHLClient
	solanaSubmitter *proof.SolanaSubmitter
	reclaimClient   *proof.ReclaimClient
)

func main() {
	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		dbPath = "agent.db"
	}
	if err := InitDB(dbPath); err != nil {
		log.Fatalf("failed to initialise database: %v", err)
	}

	dhlClient = carrier.NewDHLClient(os.Getenv("DHL_API_KEY"))
	reclaimClient = proof.NewReclaimClient(
		os.Getenv("RECLAIM_APP_ID"),
		os.Getenv("RECLAIM_APP_SECRET"),
	)

	rpcURL := os.Getenv("SOLANA_RPC")
	if rpcURL == "" {
		rpcURL = "https://api.devnet.solana.com"
	}
	if os.Getenv("TRADE_ESCROW_PROGRAM_ID") != "" && os.Getenv("SOLANA_PRIVATE_KEY_BASE58") != "" {
		submitter, err := proof.NewSolanaSubmitter(
			rpcURL,
			os.Getenv("TRADE_ESCROW_PROGRAM_ID"),
			os.Getenv("SOLANA_PRIVATE_KEY_BASE58"),
		)
		if err != nil {
			log.Fatalf("failed to initialize solana submitter: %v", err)
		}
		solanaSubmitter = submitter
	}

	http.HandleFunc("/register", RegisterHandler)
	http.HandleFunc("/poll", PollHandler)
	http.HandleFunc("/notify", NotifyHandler)
	http.HandleFunc("/health", HealthHandler)
	http.HandleFunc("/api/tracking/", TrackingHandler)
	http.HandleFunc("/marketplace/orders", MarketplaceOrdersHandler)

	pollIntervalSeconds := 30
	if raw := os.Getenv("POLL_INTERVAL_SECONDS"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed <= 0 {
			log.Fatalf("invalid POLL_INTERVAL_SECONDS: %q", raw)
		}
		pollIntervalSeconds = parsed
	}
	go func() {
		ticker := time.NewTicker(time.Duration(pollIntervalSeconds) * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			result, err := runPollCycle()
			if err != nil {
				log.Printf("background poll failed: %v", err)
				continue
			}
			log.Printf(
				"background poll checked=%d updated=%d errors=%d",
				result.Checked,
				result.Updated,
				result.Errors,
			)
			if err := runMarketplaceOrderWatchCycle(); err != nil {
				log.Printf("marketplace order watcher failed: %v", err)
			}
		}
	}()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("aether-logos agent listening on :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
