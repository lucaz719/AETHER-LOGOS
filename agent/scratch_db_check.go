package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "modernc.org/sqlite"
)

func main() {
	dbPath := "agent.db"
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	rows, err := db.Query("SELECT wallet, shop_name FROM vendors")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("Vendors in DB:")
	for rows.Next() {
		var wallet, shop string
		rows.Scan(&wallet, &shop)
		fmt.Printf("Wallet: %s | Shop: %s\n", wallet, shop)
	}
}
