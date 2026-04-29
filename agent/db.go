package main

import (
	"database/sql"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

var db *sql.DB

type Shipment struct {
	ID              int64  `json:"id"`
	TrackingID      string `json:"tracking_id"`
	Wallet          string `json:"wallet"`
	CallbackURL     string `json:"callback_url"`
	Carrier         string `json:"carrier"`
	TradeAccount    string `json:"trade_account"`
	TradeID         string `json:"trade_id"`
	ProofHash       string `json:"proof_hash"`
	ProofTxSig      string `json:"proof_tx_sig"`
	LastKnownStatus string `json:"last_known_status"`
	CreatedAt       string `json:"created_at"`
	UpdatedAt       string `json:"updated_at"`
}

type ShipmentMilestone struct {
	Status      string `json:"status"`
	Description string `json:"description"`
	Location    string `json:"location"`
	Timestamp   int64  `json:"timestamp"`
}

type Vendor struct {
	ID           int64  `json:"id"`
	Wallet       string `json:"wallet"`
	ShopName     string `json:"shop_name"`
	Description  string `json:"description"`
	VendorType   string `json:"vendor_type"`
	Categories   string `json:"categories"`
	EmailHash    string `json:"email_hash"`
	CreatedAt    string `json:"created_at"`
}

type Product struct {
	ID            int64   `json:"id"`
	VendorWallet  string  `json:"vendor_wallet"`
	Title         string  `json:"title"`
	Description   string  `json:"description"`
	PriceUsdc     float64 `json:"price_usdc"`
	Category      string  `json:"category"`
	ImageUrl      string  `json:"image_url"`
	InStock       bool    `json:"in_stock"`
	CreatedAt     string  `json:"created_at"`
}

func InitDB(path string) error {
	var err error
	db, err = sql.Open("sqlite3", path)
	if err != nil {
		return err
	}

	schema := `
	CREATE TABLE IF NOT EXISTS shipments (
		id                INTEGER PRIMARY KEY AUTOINCREMENT,
		tracking_id       TEXT NOT NULL,
		wallet            TEXT NOT NULL,
		callback_url      TEXT NOT NULL,
		carrier           TEXT NOT NULL,
		trade_account     TEXT NOT NULL DEFAULT '',
		trade_id          TEXT NOT NULL DEFAULT '',
		proof_hash        TEXT NOT NULL DEFAULT '',
		proof_tx_sig      TEXT NOT NULL DEFAULT '',
		last_known_status TEXT NOT NULL DEFAULT '',
		created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS shipment_milestones (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		shipment_id INTEGER NOT NULL,
		status TEXT NOT NULL,
		description TEXT NOT NULL,
		location TEXT NOT NULL,
		timestamp INTEGER NOT NULL,
		created_at INTEGER NOT NULL,
		UNIQUE(shipment_id, status, description, location, timestamp)
	);

	CREATE TABLE IF NOT EXISTS vendors (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		wallet TEXT NOT NULL UNIQUE,
		shop_name TEXT NOT NULL,
		description TEXT,
		vendor_type TEXT,
		categories TEXT,
		email_hash TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS products (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		vendor_wallet TEXT NOT NULL,
		title TEXT NOT NULL,
		description TEXT,
		price_usdc REAL NOT NULL,
		category TEXT,
		image_url TEXT,
		in_stock BOOLEAN DEFAULT true,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err = db.Exec(schema); err != nil {
		return err
	}
	if _, err = db.Exec(`ALTER TABLE shipments ADD COLUMN proof_tx_sig TEXT NOT NULL DEFAULT ''`); err != nil && err.Error() != "duplicate column name: proof_tx_sig" {
		return err
	}
	return nil
}

func RegisterShipment(trackingID, wallet, callbackURL, carrier, tradeAccount, tradeID string) (int64, error) {
	result, err := db.Exec(
		`INSERT INTO shipments (tracking_id, wallet, callback_url, carrier, trade_account, trade_id) VALUES (?, ?, ?, ?, ?, ?)`,
		trackingID, wallet, callbackURL, carrier, tradeAccount, tradeID,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func GetPendingShipments() ([]Shipment, error) {
	rows, err := db.Query(
		`SELECT id, tracking_id, wallet, callback_url, carrier, trade_account, trade_id, proof_hash, proof_tx_sig, last_known_status, created_at, updated_at
		 FROM shipments
		 WHERE proof_tx_sig = ''`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shipments []Shipment
	for rows.Next() {
		var s Shipment
		if err := rows.Scan(
			&s.ID,
			&s.TrackingID,
			&s.Wallet,
			&s.CallbackURL,
			&s.Carrier,
			&s.TradeAccount,
			&s.TradeID,
			&s.ProofHash,
			&s.ProofTxSig,
			&s.LastKnownStatus,
			&s.CreatedAt,
			&s.UpdatedAt,
		); err != nil {
			return nil, err
		}
		shipments = append(shipments, s)
	}
	return shipments, rows.Err()
}

func GetShipmentByTrackingID(trackingID string) (*Shipment, error) {
	var s Shipment
	err := db.QueryRow(
		`SELECT id, tracking_id, wallet, callback_url, carrier, trade_account, trade_id, proof_hash, proof_tx_sig, last_known_status, created_at, updated_at
		 FROM shipments WHERE tracking_id = ? ORDER BY id DESC LIMIT 1`,
		trackingID,
	).Scan(
		&s.ID,
		&s.TrackingID,
		&s.Wallet,
		&s.CallbackURL,
		&s.Carrier,
		&s.TradeAccount,
		&s.TradeID,
		&s.ProofHash,
		&s.ProofTxSig,
		&s.LastKnownStatus,
		&s.CreatedAt,
		&s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func GetShipmentByTradeAccount(tradeAccount string) (*Shipment, error) {
	var s Shipment
	err := db.QueryRow(
		`SELECT id, tracking_id, wallet, callback_url, carrier, trade_account, trade_id, proof_hash, proof_tx_sig, last_known_status, created_at, updated_at
		 FROM shipments WHERE trade_account = ? ORDER BY id DESC LIMIT 1`,
		tradeAccount,
	).Scan(
		&s.ID,
		&s.TrackingID,
		&s.Wallet,
		&s.CallbackURL,
		&s.Carrier,
		&s.TradeAccount,
		&s.TradeID,
		&s.ProofHash,
		&s.ProofTxSig,
		&s.LastKnownStatus,
		&s.CreatedAt,
		&s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}


func UpdateStatus(id int64, status string) error {
	_, err := db.Exec(
		`UPDATE shipments SET last_known_status = ?, updated_at = ? WHERE id = ?`,
		status, time.Now().UTC().Format(time.RFC3339), id,
	)
	return err
}

func UpdateShipmentProof(id int64, proofHash, txSig string) error {
	_, err := db.Exec(
		`UPDATE shipments SET proof_hash = ?, proof_tx_sig = ?, updated_at = ? WHERE id = ?`,
		proofHash, txSig, time.Now().UTC().Format(time.RFC3339), id,
	)
	return err
}

func UpsertMilestones(shipmentID int64, milestones []ShipmentMilestone) error {
	now := time.Now().UTC().Unix()
	for _, m := range milestones {
		if _, err := db.Exec(
			`INSERT OR IGNORE INTO shipment_milestones (shipment_id, status, description, location, timestamp, created_at)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			shipmentID, m.Status, m.Description, m.Location, m.Timestamp, now,
		); err != nil {
			return err
		}
	}
	return nil
}

func GetMilestonesByShipmentID(shipmentID int64) ([]ShipmentMilestone, error) {
	rows, err := db.Query(
		`SELECT status, description, location, timestamp
		 FROM shipment_milestones
		 WHERE shipment_id = ?
		 ORDER BY timestamp ASC, id ASC`,
		shipmentID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ShipmentMilestone
	for rows.Next() {
		var m ShipmentMilestone
		if err := rows.Scan(&m.Status, &m.Description, &m.Location, &m.Timestamp); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// Vendor database functions
func RegisterVendor(wallet, shopName, description, vendorType, categories, emailHash string) (int64, error) {
	result, err := db.Exec(
		`INSERT INTO vendors (wallet, shop_name, description, vendor_type, categories, email_hash) VALUES (?, ?, ?, ?, ?, ?)`,
		wallet, shopName, description, vendorType, categories, emailHash,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func GetVendorByWallet(wallet string) (*Vendor, error) {
	var v Vendor
	err := db.QueryRow(
		`SELECT id, wallet, shop_name, description, vendor_type, categories, email_hash, created_at FROM vendors WHERE wallet = ?`,
		wallet,
	).Scan(&v.ID, &v.Wallet, &v.ShopName, &v.Description, &v.VendorType, &v.Categories, &v.EmailHash, &v.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &v, nil
}

// Product database functions
func CreateProduct(vendorWallet, title, description string, priceUsdc float64, category, imageUrl string) (int64, error) {
	result, err := db.Exec(
		`INSERT INTO products (vendor_wallet, title, description, price_usdc, category, image_url, in_stock) VALUES (?, ?, ?, ?, ?, ?, true)`,
		vendorWallet, title, description, priceUsdc, category, imageUrl,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func GetProductByID(id int64) (*Product, error) {
	var p Product
	err := db.QueryRow(
		`SELECT id, vendor_wallet, title, description, price_usdc, category, image_url, in_stock, created_at FROM products WHERE id = ?`,
		id,
	).Scan(&p.ID, &p.VendorWallet, &p.Title, &p.Description, &p.PriceUsdc, &p.Category, &p.ImageUrl, &p.InStock, &p.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func GetAllProducts() ([]Product, error) {
	rows, err := db.Query(`SELECT id, vendor_wallet, title, description, price_usdc, category, image_url, in_stock, created_at FROM products WHERE in_stock = true ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.VendorWallet, &p.Title, &p.Description, &p.PriceUsdc, &p.Category, &p.ImageUrl, &p.InStock, &p.CreatedAt); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, rows.Err()
}

func GetProductsByVendor(vendorWallet string) ([]Product, error) {
	rows, err := db.Query(
		`SELECT id, vendor_wallet, title, description, price_usdc, category, image_url, in_stock, created_at FROM products WHERE vendor_wallet = ? ORDER BY created_at DESC`,
		vendorWallet,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.VendorWallet, &p.Title, &p.Description, &p.PriceUsdc, &p.Category, &p.ImageUrl, &p.InStock, &p.CreatedAt); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, rows.Err()
}

func GetProductsByCategory(category string) ([]Product, error) {
	rows, err := db.Query(
		`SELECT id, vendor_wallet, title, description, price_usdc, category, image_url, in_stock, created_at FROM products WHERE category = ? AND in_stock = true ORDER BY created_at DESC`,
		category,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.VendorWallet, &p.Title, &p.Description, &p.PriceUsdc, &p.Category, &p.ImageUrl, &p.InStock, &p.CreatedAt); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, rows.Err()
}

func SearchProducts(searchTerm string) ([]Product, error) {
	query := "%" + searchTerm + "%"
	rows, err := db.Query(
		`SELECT id, vendor_wallet, title, description, price_usdc, category, image_url, in_stock, created_at FROM products WHERE (title LIKE ? OR description LIKE ?) AND in_stock = true ORDER BY created_at DESC`,
		query, query,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.VendorWallet, &p.Title, &p.Description, &p.PriceUsdc, &p.Category, &p.ImageUrl, &p.InStock, &p.CreatedAt); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, rows.Err()
}
