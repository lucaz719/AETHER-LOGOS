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
	dbPath := os.Getenv("AGENT_DB_PATH")
	if dbPath == "" {
		dbPath = os.Getenv("DATABASE_PATH")
	}
	if dbPath == "" {
		dbPath = "agent.db"
	}
	if err := InitDB(dbPath); err != nil {
		log.Fatalf("failed to initialise database: %v", err)
	}

	dhlClient = carrier.NewDHLClient(os.Getenv("DHL_API_KEY"))
	mockProof := false
	if raw := os.Getenv("MOCK_PROOF"); raw != "" {
		parsed, err := strconv.ParseBool(raw)
		if err != nil {
			log.Fatalf("invalid MOCK_PROOF: %q", raw)
		}
		mockProof = parsed
	}
	reclaimClient = proof.NewReclaimClient(
		os.Getenv("RECLAIM_APP_ID"),
		os.Getenv("RECLAIM_APP_SECRET"),
		mockProof,
	)
	// Accept both SOLANA_RPC (agent-native) and SOLANA_RPC_URL (.env.example name).
	rpcURL := os.Getenv("SOLANA_RPC")
	if rpcURL == "" {
		rpcURL = os.Getenv("SOLANA_RPC_URL")
	}
	if rpcURL == "" {
		rpcURL = "https://api.devnet.solana.com"
	}

	hasOnChainKey := os.Getenv("TRADE_ESCROW_PROGRAM_ID") != "" && os.Getenv("SOLANA_PRIVATE_KEY_BASE58") != ""
	if hasOnChainKey {
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

	// Log startup with institutional style
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	LogInitialization(port, mockProof, hasOnChainKey)

	http.HandleFunc("/register", RegisterHandler)
	http.HandleFunc("/poll", PollHandler)
	http.HandleFunc("/notify", NotifyHandler)
	http.HandleFunc("/health", HealthHandler)
	http.HandleFunc("/api/tracking/", TrackingHandler)
	http.HandleFunc("/marketplace/orders", MarketplaceOrdersHandler)

	// Vendor API
	http.HandleFunc("/api/vendor/register", VendorRegisterHandler)
	http.HandleFunc("/api/vendor/", VendorGetHandler)

	// Product API
	http.HandleFunc("/api/vendor/products", ProductCreateHandler)
	http.HandleFunc("/api/products", ProductsListHandler)
	http.HandleFunc("/api/products/", ProductGetHandler)

	// User API
	http.HandleFunc("/api/users/", userDispatch)
	http.HandleFunc("/api/users", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			userDispatch(w, r)
		} else {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// Store API
	http.HandleFunc("/api/stores", func(w http.ResponseWriter, r *http.Request) {
		storeDispatch(w, r)
	})
	http.HandleFunc("/api/stores/", storeDispatch)
	http.HandleFunc("/api/vendors/", storeDispatch)

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

	fmt.Printf("aether-logos agent listening on :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, corsMiddleware(http.DefaultServeMux)))
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
