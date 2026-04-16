package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	if err := InitDB("agent.db"); err != nil {
		log.Fatalf("failed to initialise database: %v", err)
	}

	http.HandleFunc("/register", RegisterHandler)
	http.HandleFunc("/poll", PollHandler)
	http.HandleFunc("/notify", NotifyHandler)
	http.HandleFunc("/health", HealthHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("aether-logos agent listening on :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
