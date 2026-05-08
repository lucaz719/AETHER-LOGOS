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

	// Clear old demo data to avoid conflicts
	db.Exec("DELETE FROM products")
	db.Exec("DELETE FROM vendors")

	// Seed some vendors with STABLE FULL IDs
	vendors := []struct {
		wallet, shop, desc, vtype, cats string
	}{
		{"AETHER_PRIME_MFG", "AETHER Prime Manufacturing", "High-precision industrial components and precision hardware.", "manufacturer", "Industrial Components"},
		{"LOGOS_IOT_SOLUTIONS", "Logos IoT Solutions", "Enterprise-grade IoT hardware and sensors for global tracking.", "wholesaler", "IoT Hardware"},
		{"GLOBAL_COLD_CHAIN", "Global Cold-Chain Systems", "Specialized logistics hardware for temperature-controlled shipping.", "distributor", "Cold Chain"},
	}

	for _, v := range vendors {
		_, err := db.Exec(`INSERT OR IGNORE INTO vendors (wallet, shop_name, description, vendor_type, categories) VALUES (?, ?, ?, ?, ?)`,
			v.wallet, v.shop, v.desc, v.vtype, v.cats)
		if err != nil {
			log.Printf("Failed to seed vendor %s: %v", v.shop, err)
		}
	}

	// Seed products linked to these STABLE IDs
	products := []struct {
		wallet, title, desc, sdesc, cat, img, tier string
		price, rating                               float64
		moq, lead                                   int64
	}{
		{"AETHER_PRIME_MFG", "AETHER Precision Thermal Sensor v4", "High-accuracy industrial thermal sensor for cold-chain monitoring.", "Industrial Grade Thermal Sensor", "Industrial Components", "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80", "manufacturer", 145.00, 4.9, 50, 14},
		{"AETHER_PRIME_MFG", "Logos G-Force Monitor Pro", "Shock and impact monitoring for high-value sensitive cargo.", "Impact & Shock Monitor", "Industrial Components", "https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?w=800&q=80", "manufacturer", 89.50, 4.7, 100, 21},
		{"LOGOS_IOT_SOLUTIONS", "Smart Mesh Gateway Hub", "Centralized connectivity for enterprise IoT mesh networks.", "IoT Connectivity Hub", "IoT Hardware", "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80", "wholesaler", 299.00, 4.5, 10, 7},
		{"LOGOS_IOT_SOLUTIONS", "AETHER Asset Tracker (LTE-M)", "Global real-time tracking for shipping containers.", "GPS Asset Tracker", "IoT Hardware", "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80", "wholesaler", 120.00, 4.8, 25, 5},
		{"GLOBAL_COLD_CHAIN", "Cryo-Safe Insulation Panel", "Advanced vacuum insulation for extreme temperature maintenance.", "Extreme Insulation Panel", "Cold Chain", "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80", "distributor", 450.00, 4.9, 5, 10},
	}

	fmt.Println("Seeding stable demo products...")
	for _, p := range products {
		_, err := db.Exec(`INSERT INTO products (vendor_wallet, title, description, short_description, price_usdc, category, image_url, in_stock, moq, lead_time_days, rating, seller_tier)
			VALUES (?, ?, ?, ?, ?, ?, ?, true, ?, ?, ?, ?)`,
			p.wallet, p.title, p.desc, p.sdesc, p.price, p.cat, p.img, p.moq, p.lead, p.rating, p.tier)
		if err != nil {
			log.Printf("Failed to seed product %s: %v", p.title, err)
		} else {
			fmt.Printf("✓ Seeded: %s\n", p.title)
		}
	}
	fmt.Println("Demo seeding 100% complete.")
}
