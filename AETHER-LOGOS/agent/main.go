package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func middlewareCors(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		if r.Method == "OPTIONS" {
			return
		}
		next(w, r)
	}
}

func main() {
	if err := InitDB("agent.db"); err != nil {
		log.Fatalf("failed to initialise database: %v", err)
	}

	http.HandleFunc("/register", middlewareCors(RegisterHandler))
	http.HandleFunc("/poll", middlewareCors(PollHandler))
	http.HandleFunc("/notify", middlewareCors(NotifyHandler))
	http.HandleFunc("/health", middlewareCors(HealthHandler))
	http.HandleFunc("/status", middlewareCors(StatusHandler))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("aether-logos agent listening on :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
