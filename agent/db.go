package main

import (
	"database/sql"
	"strings"
	"time"

	_ "modernc.org/sqlite"
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
	ID          int64  `json:"id"`
	Wallet      string `json:"wallet"`
	ShopName    string `json:"shop_name"`
	Description string `json:"description"`
	VendorType  string `json:"vendor_type"`
	Categories  string `json:"categories"`
	EmailHash   string `json:"email_hash"`
	CreatedAt   string `json:"created_at"`
}

type Product struct {
	ID               int64   `json:"id"`
	VendorWallet     string  `json:"vendor_wallet"`
	Title            string  `json:"title"`
	Description      string  `json:"description"`
	ShortDescription string  `json:"short_description"`
	PriceUsdc        float64 `json:"price_usdc"`
	Category         string  `json:"category"`
	ImageUrl         string  `json:"image_url"`
	InStock          bool    `json:"in_stock"`
	MOQ              int64   `json:"moq"`
	LeadTimeDays     int64   `json:"lead_time_days"`
	Rating           float64 `json:"rating"`
	SellerTier       string  `json:"seller_tier"`
	CreatedAt        string  `json:"created_at"`
}

func InitDB(path string) error {
	var err error
	db, err = sql.Open("sqlite", path)
	if err != nil {
		return err
	}

	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		wallet_address TEXT NOT NULL UNIQUE,
		user_type TEXT NOT NULL DEFAULT 'buyer',
		username TEXT,
		email_hash TEXT,
		profile_image_cid TEXT,
		bio TEXT,
		preferred_currency TEXT DEFAULT 'USDC',
		notification_preferences TEXT DEFAULT '{}',
		kyc_status TEXT DEFAULT 'none',
		reputation_score REAL DEFAULT 0.0,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		last_login_at TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS user_addresses (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		address_type TEXT NOT NULL DEFAULT 'shipping',
		recipient_name TEXT,
		street TEXT,
		city TEXT,
		state_province TEXT,
		postal_code TEXT,
		country TEXT,
		phone TEXT,
		is_default BOOLEAN DEFAULT false,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS user_preferences (
		user_id INTEGER PRIMARY KEY,
		theme TEXT DEFAULT 'dark',
		language TEXT DEFAULT 'en',
		currency TEXT DEFAULT 'USDC',
		email_notifications BOOLEAN DEFAULT true,
		push_notifications BOOLEAN DEFAULT false,
		two_factor_enabled BOOLEAN DEFAULT false
	);

	CREATE TABLE IF NOT EXISTS stores (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		owner_wallet TEXT NOT NULL,
		slug TEXT NOT NULL UNIQUE,
		store_name TEXT NOT NULL,
		description TEXT,
		logo_cid TEXT,
		banner_cid TEXT,
		store_type TEXT DEFAULT 'retail',
		categories TEXT,
		is_active BOOLEAN DEFAULT true,
		is_verified BOOLEAN DEFAULT false,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		settings TEXT DEFAULT '{}'
	);

	CREATE TABLE IF NOT EXISTS store_members (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		store_id INTEGER NOT NULL,
		user_wallet TEXT NOT NULL,
		role TEXT NOT NULL DEFAULT 'staff',
		permissions TEXT DEFAULT '{}',
		invited_by TEXT,
		joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(store_id, user_wallet)
	);

	CREATE TABLE IF NOT EXISTS store_analytics (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		store_id INTEGER NOT NULL,
		date TEXT NOT NULL,
		views INTEGER DEFAULT 0,
		orders INTEGER DEFAULT 0,
		revenue REAL DEFAULT 0,
		visitors INTEGER DEFAULT 0,
		UNIQUE(store_id, date)
	);

	CREATE TABLE IF NOT EXISTS promotions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		store_id INTEGER NOT NULL,
		code TEXT,
		promo_type TEXT NOT NULL DEFAULT 'discount',
		value REAL NOT NULL DEFAULT 0,
		min_order REAL DEFAULT 0,
		max_uses INTEGER DEFAULT 0,
		uses_count INTEGER DEFAULT 0,
		starts_at TIMESTAMP,
		ends_at TIMESTAMP,
		is_active BOOLEAN DEFAULT true,
		description TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

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
		short_description TEXT,
		price_usdc REAL NOT NULL,
		category TEXT,
		image_url TEXT,
		in_stock BOOLEAN DEFAULT true,
		moq INTEGER DEFAULT 1,
		lead_time_days INTEGER DEFAULT 7,
		rating REAL DEFAULT 4.5,
		seller_tier TEXT DEFAULT 'wholesaler',
		store_id INTEGER,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err = db.Exec(schema); err != nil {
		return err
	}
	if _, err = db.Exec(`ALTER TABLE shipments ADD COLUMN proof_tx_sig TEXT NOT NULL DEFAULT ''`); err != nil && !strings.Contains(err.Error(), "duplicate column name") {
		return err
	}
	if _, err = db.Exec(`ALTER TABLE products ADD COLUMN store_id INTEGER`); err != nil && !strings.Contains(err.Error(), "duplicate column name") {
		return err
	}
	if _, err = db.Exec(`ALTER TABLE products ADD COLUMN moq INTEGER DEFAULT 1`); err != nil && !strings.Contains(err.Error(), "duplicate column name") {
		return err
	}
	if _, err = db.Exec(`ALTER TABLE products ADD COLUMN lead_time_days INTEGER DEFAULT 7`); err != nil && !strings.Contains(err.Error(), "duplicate column name") {
		return err
	}
	if _, err = db.Exec(`ALTER TABLE products ADD COLUMN rating REAL DEFAULT 4.5`); err != nil && !strings.Contains(err.Error(), "duplicate column name") {
		return err
	}
	if _, err = db.Exec(`ALTER TABLE products ADD COLUMN seller_tier TEXT DEFAULT 'wholesaler'`); err != nil && !strings.Contains(err.Error(), "duplicate column name") {
		return err
	}
	if _, err = db.Exec(`ALTER TABLE products ADD COLUMN short_description TEXT`); err != nil && !strings.Contains(err.Error(), "duplicate column name") {
		return err
	}
	if _, err = db.Exec(`CREATE INDEX IF NOT EXISTS idx_shipments_trade_account ON shipments(trade_account)`); err != nil {
		return err
	}
	if _, err = db.Exec(`CREATE INDEX IF NOT EXISTS idx_shipments_tracking_id ON shipments(tracking_id)`); err != nil {
		return err
	}
	if _, err = db.Exec(`CREATE INDEX IF NOT EXISTS idx_products_vendor_wallet ON products(vendor_wallet)`); err != nil {
		return err
	}
	if _, err = db.Exec(`CREATE INDEX IF NOT EXISTS idx_shipment_milestones_shipment_timestamp ON shipment_milestones(shipment_id, timestamp)`); err != nil {
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

func GetAllShipments() ([]Shipment, error) {
	rows, err := db.Query(
		`SELECT id, tracking_id, wallet, callback_url, carrier, trade_account, trade_id, proof_hash, proof_tx_sig, last_known_status, created_at, updated_at
		 FROM shipments
		 ORDER BY created_at DESC`,
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

func UpdateShipmentTracking(id int64, trackingID string) error {
	_, err := db.Exec(
		`UPDATE shipments SET tracking_id = ?, updated_at = ? WHERE id = ?`,
		trackingID, time.Now().UTC().Format(time.RFC3339), id,
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

func GetAllVendors() ([]Vendor, error) {
	rows, err := db.Query(`SELECT id, wallet, shop_name, description, vendor_type, categories, email_hash, created_at FROM vendors`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var vendors []Vendor
	for rows.Next() {
		var v Vendor
		if err := rows.Scan(&v.ID, &v.Wallet, &v.ShopName, &v.Description, &v.VendorType, &v.Categories, &v.EmailHash, &v.CreatedAt); err != nil {
			return nil, err
		}
		vendors = append(vendors, v)
	}
	return vendors, nil
}

// Product database functions
func CreateProduct(vendorWallet, title, description, shortDescription string, priceUsdc float64, category, imageUrl string, moq, leadTimeDays int64, rating float64, sellerTier string) (int64, error) {
	result, err := db.Exec(
		`INSERT INTO products (vendor_wallet, title, description, short_description, price_usdc, category, image_url, in_stock, moq, lead_time_days, rating, seller_tier)
		 VALUES (?, ?, ?, ?, ?, ?, ?, true, ?, ?, ?, ?)`,
		vendorWallet, title, description, shortDescription, priceUsdc, category, imageUrl, moq, leadTimeDays, rating, sellerTier,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func GetProductByID(id int64) (*Product, error) {
	var p Product
	err := db.QueryRow(
		`SELECT id, vendor_wallet, title, COALESCE(description,''), COALESCE(short_description,''), price_usdc, COALESCE(category,''), COALESCE(image_url,''), in_stock,
		        COALESCE(moq,1), COALESCE(lead_time_days,7), COALESCE(rating,4.5), COALESCE(seller_tier,'wholesaler'), created_at
		 FROM products WHERE id = ?`,
		id,
	).Scan(&p.ID, &p.VendorWallet, &p.Title, &p.Description, &p.ShortDescription, &p.PriceUsdc, &p.Category, &p.ImageUrl, &p.InStock, &p.MOQ, &p.LeadTimeDays, &p.Rating, &p.SellerTier, &p.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func GetAllProducts() ([]Product, error) {
	rows, err := db.Query(
		`SELECT id, vendor_wallet, title, COALESCE(description,''), COALESCE(short_description,''), price_usdc, COALESCE(category,''), COALESCE(image_url,''), in_stock,
		        COALESCE(moq,1), COALESCE(lead_time_days,7), COALESCE(rating,4.5), COALESCE(seller_tier,'wholesaler'), created_at
		 FROM products
		 WHERE in_stock = true
		 ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.VendorWallet, &p.Title, &p.Description, &p.ShortDescription, &p.PriceUsdc, &p.Category, &p.ImageUrl, &p.InStock, &p.MOQ, &p.LeadTimeDays, &p.Rating, &p.SellerTier, &p.CreatedAt); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, rows.Err()
}

func GetProductsByVendor(vendorWallet string) ([]Product, error) {
	rows, err := db.Query(
		`SELECT id, vendor_wallet, title, COALESCE(description,''), COALESCE(short_description,''), price_usdc, COALESCE(category,''), COALESCE(image_url,''), in_stock,
		        COALESCE(moq,1), COALESCE(lead_time_days,7), COALESCE(rating,4.5), COALESCE(seller_tier,'wholesaler'), created_at
		 FROM products
		 WHERE vendor_wallet = ?
		 ORDER BY created_at DESC`,
		vendorWallet,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.VendorWallet, &p.Title, &p.Description, &p.ShortDescription, &p.PriceUsdc, &p.Category, &p.ImageUrl, &p.InStock, &p.MOQ, &p.LeadTimeDays, &p.Rating, &p.SellerTier, &p.CreatedAt); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, rows.Err()
}

func GetProductsByCategory(category string) ([]Product, error) {
	rows, err := db.Query(
		`SELECT id, vendor_wallet, title, COALESCE(description,''), COALESCE(short_description,''), price_usdc, COALESCE(category,''), COALESCE(image_url,''), in_stock,
		        COALESCE(moq,1), COALESCE(lead_time_days,7), COALESCE(rating,4.5), COALESCE(seller_tier,'wholesaler'), created_at
		 FROM products
		 WHERE category = ? AND in_stock = true
		 ORDER BY created_at DESC`,
		category,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.VendorWallet, &p.Title, &p.Description, &p.ShortDescription, &p.PriceUsdc, &p.Category, &p.ImageUrl, &p.InStock, &p.MOQ, &p.LeadTimeDays, &p.Rating, &p.SellerTier, &p.CreatedAt); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, rows.Err()
}

// ─── User Structs & DB Functions ───────────────────────────────────────────

type User struct {
	ID                      int64   `json:"id"`
	WalletAddress           string  `json:"wallet_address"`
	UserType                string  `json:"user_type"`
	Username                string  `json:"username"`
	EmailHash               string  `json:"email_hash"`
	ProfileImageCid         string  `json:"profile_image_cid"`
	Bio                     string  `json:"bio"`
	PreferredCurrency       string  `json:"preferred_currency"`
	NotificationPreferences string  `json:"notification_preferences"`
	KycStatus               string  `json:"kyc_status"`
	ReputationScore         float64 `json:"reputation_score"`
	CreatedAt               string  `json:"created_at"`
	UpdatedAt               string  `json:"updated_at"`
	LastLoginAt             string  `json:"last_login_at"`
}

type UserAddress struct {
	ID            int64  `json:"id"`
	UserID        int64  `json:"user_id"`
	AddressType   string `json:"address_type"`
	RecipientName string `json:"recipient_name"`
	Street        string `json:"street"`
	City          string `json:"city"`
	StateProvince string `json:"state_province"`
	PostalCode    string `json:"postal_code"`
	Country       string `json:"country"`
	Phone         string `json:"phone"`
	IsDefault     bool   `json:"is_default"`
	CreatedAt     string `json:"created_at"`
}

type UserPreferences struct {
	UserID             int64  `json:"user_id"`
	Theme              string `json:"theme"`
	Language           string `json:"language"`
	Currency           string `json:"currency"`
	EmailNotifications bool   `json:"email_notifications"`
	PushNotifications  bool   `json:"push_notifications"`
	TwoFactorEnabled   bool   `json:"two_factor_enabled"`
}

// ─── Store Structs & DB Functions ──────────────────────────────────────────

type Store struct {
	ID          int64  `json:"id"`
	OwnerWallet string `json:"owner_wallet"`
	Slug        string `json:"slug"`
	StoreName   string `json:"store_name"`
	Description string `json:"description"`
	LogoCid     string `json:"logo_cid"`
	BannerCid   string `json:"banner_cid"`
	StoreType   string `json:"store_type"`
	Categories  string `json:"categories"`
	IsActive    bool   `json:"is_active"`
	IsVerified  bool   `json:"is_verified"`
	CreatedAt   string `json:"created_at"`
	Settings    string `json:"settings"`
}

type StoreMember struct {
	ID          int64  `json:"id"`
	StoreID     int64  `json:"store_id"`
	UserWallet  string `json:"user_wallet"`
	Role        string `json:"role"`
	Permissions string `json:"permissions"`
	InvitedBy   string `json:"invited_by"`
	JoinedAt    string `json:"joined_at"`
}

type StoreAnalytics struct {
	ID       int64   `json:"id"`
	StoreID  int64   `json:"store_id"`
	Date     string  `json:"date"`
	Views    int64   `json:"views"`
	Orders   int64   `json:"orders"`
	Revenue  float64 `json:"revenue"`
	Visitors int64   `json:"visitors"`
}

type Promotion struct {
	ID          int64   `json:"id"`
	StoreID     int64   `json:"store_id"`
	Code        string  `json:"code"`
	PromoType   string  `json:"promo_type"`
	Value       float64 `json:"value"`
	MinOrder    float64 `json:"min_order"`
	MaxUses     int64   `json:"max_uses"`
	UsesCount   int64   `json:"uses_count"`
	StartsAt    string  `json:"starts_at"`
	EndsAt      string  `json:"ends_at"`
	IsActive    bool    `json:"is_active"`
	Description string  `json:"description"`
	CreatedAt   string  `json:"created_at"`
}

// ─── User DB Functions ──────────────────────────────────────────────────────

func CreateUser(walletAddress, userType, username, emailHash string) (int64, error) {
	result, err := db.Exec(
		`INSERT INTO users (wallet_address, user_type, username, email_hash) VALUES (?, ?, ?, ?)`,
		walletAddress, userType, username, emailHash,
	)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	// seed preferences row
	_, _ = db.Exec(`INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)`, id)
	return id, nil
}

func GetUserByWallet(walletAddress string) (*User, error) {
	var u User
	err := db.QueryRow(
		`SELECT id, wallet_address, user_type, COALESCE(username,''), COALESCE(email_hash,''),
		        COALESCE(profile_image_cid,''), COALESCE(bio,''), COALESCE(preferred_currency,'USDC'),
		        COALESCE(notification_preferences,'{}'), COALESCE(kyc_status,'none'), reputation_score,
		        created_at, updated_at, COALESCE(last_login_at,'')
		 FROM users WHERE wallet_address = ?`,
		walletAddress,
	).Scan(&u.ID, &u.WalletAddress, &u.UserType, &u.Username, &u.EmailHash,
		&u.ProfileImageCid, &u.Bio, &u.PreferredCurrency,
		&u.NotificationPreferences, &u.KycStatus, &u.ReputationScore,
		&u.CreatedAt, &u.UpdatedAt, &u.LastLoginAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func UpdateUser(walletAddress, userType, username, bio, profileImageCid, preferredCurrency string) error {
	_, err := db.Exec(
		`UPDATE users SET user_type=?, username=?, bio=?, profile_image_cid=?, preferred_currency=?, updated_at=? WHERE wallet_address=?`,
		userType, username, bio, profileImageCid, preferredCurrency,
		time.Now().UTC().Format(time.RFC3339), walletAddress,
	)
	return err
}

func DeleteUser(walletAddress string) error {
	_, err := db.Exec(`DELETE FROM users WHERE wallet_address=?`, walletAddress)
	return err
}

func TouchUserLogin(walletAddress string) error {
	_, err := db.Exec(
		`UPDATE users SET last_login_at=?, updated_at=? WHERE wallet_address=?`,
		time.Now().UTC().Format(time.RFC3339),
		time.Now().UTC().Format(time.RFC3339),
		walletAddress,
	)
	return err
}

func GetUserAddresses(walletAddress string) ([]UserAddress, error) {
	rows, err := db.Query(
		`SELECT a.id, a.user_id, a.address_type, COALESCE(a.recipient_name,''), COALESCE(a.street,''),
		        COALESCE(a.city,''), COALESCE(a.state_province,''), COALESCE(a.postal_code,''),
		        COALESCE(a.country,''), COALESCE(a.phone,''), a.is_default, a.created_at
		 FROM user_addresses a
		 JOIN users u ON u.id = a.user_id
		 WHERE u.wallet_address = ?
		 ORDER BY a.is_default DESC, a.id ASC`,
		walletAddress,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []UserAddress
	for rows.Next() {
		var a UserAddress
		if err := rows.Scan(&a.ID, &a.UserID, &a.AddressType, &a.RecipientName, &a.Street,
			&a.City, &a.StateProvince, &a.PostalCode, &a.Country, &a.Phone, &a.IsDefault, &a.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func CreateUserAddress(walletAddress, addressType, recipientName, street, city, stateProvince, postalCode, country, phone string, isDefault bool) (int64, error) {
	user, err := GetUserByWallet(walletAddress)
	if err != nil {
		return 0, err
	}
	if isDefault {
		_, _ = db.Exec(`UPDATE user_addresses SET is_default=false WHERE user_id=?`, user.ID)
	}
	result, err := db.Exec(
		`INSERT INTO user_addresses (user_id, address_type, recipient_name, street, city, state_province, postal_code, country, phone, is_default)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		user.ID, addressType, recipientName, street, city, stateProvince, postalCode, country, phone, isDefault,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func UpdateUserAddress(id int64, walletAddress, addressType, recipientName, street, city, stateProvince, postalCode, country, phone string, isDefault bool) error {
	user, err := GetUserByWallet(walletAddress)
	if err != nil {
		return err
	}
	if isDefault {
		_, _ = db.Exec(`UPDATE user_addresses SET is_default=false WHERE user_id=?`, user.ID)
	}
	_, err = db.Exec(
		`UPDATE user_addresses SET address_type=?, recipient_name=?, street=?, city=?, state_province=?, postal_code=?, country=?, phone=?, is_default=?
		 WHERE id=? AND user_id=?`,
		addressType, recipientName, street, city, stateProvince, postalCode, country, phone, isDefault, id, user.ID,
	)
	return err
}

func DeleteUserAddress(id int64, walletAddress string) error {
	user, err := GetUserByWallet(walletAddress)
	if err != nil {
		return err
	}
	_, err = db.Exec(`DELETE FROM user_addresses WHERE id=? AND user_id=?`, id, user.ID)
	return err
}

func GetUserPreferences(walletAddress string) (*UserPreferences, error) {
	user, err := GetUserByWallet(walletAddress)
	if err != nil {
		return nil, err
	}
	var p UserPreferences
	err = db.QueryRow(
		`SELECT user_id, COALESCE(theme,'dark'), COALESCE(language,'en'), COALESCE(currency,'USDC'),
		        email_notifications, push_notifications, two_factor_enabled
		 FROM user_preferences WHERE user_id=?`,
		user.ID,
	).Scan(&p.UserID, &p.Theme, &p.Language, &p.Currency, &p.EmailNotifications, &p.PushNotifications, &p.TwoFactorEnabled)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func UpsertUserPreferences(walletAddress, theme, language, currency string, emailNotif, pushNotif, twoFactor bool) error {
	user, err := GetUserByWallet(walletAddress)
	if err != nil {
		return err
	}
	_, err = db.Exec(
		`INSERT INTO user_preferences (user_id, theme, language, currency, email_notifications, push_notifications, two_factor_enabled)
		 VALUES (?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(user_id) DO UPDATE SET theme=excluded.theme, language=excluded.language,
		   currency=excluded.currency, email_notifications=excluded.email_notifications,
		   push_notifications=excluded.push_notifications, two_factor_enabled=excluded.two_factor_enabled`,
		user.ID, theme, language, currency, emailNotif, pushNotif, twoFactor,
	)
	return err
}

// ─── Store DB Functions ─────────────────────────────────────────────────────

func CreateStore(ownerWallet, slug, storeName, description, storeType, categories string) (int64, error) {
	result, err := db.Exec(
		`INSERT INTO stores (owner_wallet, slug, store_name, description, store_type, categories) VALUES (?, ?, ?, ?, ?, ?)`,
		ownerWallet, slug, storeName, description, storeType, categories,
	)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	// Owner is automatically a member with owner role
	_, _ = db.Exec(
		`INSERT OR IGNORE INTO store_members (store_id, user_wallet, role) VALUES (?, ?, 'owner')`,
		id, ownerWallet,
	)
	return id, nil
}

func GetStoreByID(id int64) (*Store, error) {
	var s Store
	err := db.QueryRow(
		`SELECT id, owner_wallet, slug, store_name, COALESCE(description,''), COALESCE(logo_cid,''),
		        COALESCE(banner_cid,''), COALESCE(store_type,'retail'), COALESCE(categories,''),
		        is_active, is_verified, created_at, COALESCE(settings,'{}')
		 FROM stores WHERE id=?`,
		id,
	).Scan(&s.ID, &s.OwnerWallet, &s.Slug, &s.StoreName, &s.Description,
		&s.LogoCid, &s.BannerCid, &s.StoreType, &s.Categories,
		&s.IsActive, &s.IsVerified, &s.CreatedAt, &s.Settings)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func GetStoreBySlug(slug string) (*Store, error) {
	var s Store
	err := db.QueryRow(
		`SELECT id, owner_wallet, slug, store_name, COALESCE(description,''), COALESCE(logo_cid,''),
		        COALESCE(banner_cid,''), COALESCE(store_type,'retail'), COALESCE(categories,''),
		        is_active, is_verified, created_at, COALESCE(settings,'{}')
		 FROM stores WHERE slug=?`,
		slug,
	).Scan(&s.ID, &s.OwnerWallet, &s.Slug, &s.StoreName, &s.Description,
		&s.LogoCid, &s.BannerCid, &s.StoreType, &s.Categories,
		&s.IsActive, &s.IsVerified, &s.CreatedAt, &s.Settings)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func GetAllStores() ([]Store, error) {
	rows, err := db.Query(
		`SELECT id, owner_wallet, slug, store_name, COALESCE(description,''), COALESCE(logo_cid,''),
		        COALESCE(banner_cid,''), COALESCE(store_type,'retail'), COALESCE(categories,''),
		        is_active, is_verified, created_at, COALESCE(settings,'{}')
		 FROM stores
		 WHERE is_active = true
		 ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stores []Store
	for rows.Next() {
		var s Store
		if err := rows.Scan(&s.ID, &s.OwnerWallet, &s.Slug, &s.StoreName, &s.Description,
			&s.LogoCid, &s.BannerCid, &s.StoreType, &s.Categories,
			&s.IsActive, &s.IsVerified, &s.CreatedAt, &s.Settings); err != nil {
			return nil, err
		}
		stores = append(stores, s)
	}
	return stores, rows.Err()
}

func GetStoresByOwner(ownerWallet string) ([]Store, error) {
	rows, err := db.Query(
		`SELECT id, owner_wallet, slug, store_name, COALESCE(description,''), COALESCE(logo_cid,''),
		        COALESCE(banner_cid,''), COALESCE(store_type,'retail'), COALESCE(categories,''),
		        is_active, is_verified, created_at, COALESCE(settings,'{}')
		 FROM stores WHERE owner_wallet=? ORDER BY created_at DESC`,
		ownerWallet,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var stores []Store
	for rows.Next() {
		var s Store
		if err := rows.Scan(&s.ID, &s.OwnerWallet, &s.Slug, &s.StoreName, &s.Description,
			&s.LogoCid, &s.BannerCid, &s.StoreType, &s.Categories,
			&s.IsActive, &s.IsVerified, &s.CreatedAt, &s.Settings); err != nil {
			return nil, err
		}
		stores = append(stores, s)
	}
	return stores, rows.Err()
}

func UpdateStore(id int64, ownerWallet, storeName, description, logoCid, bannerCid, storeType, categories, settings string, isActive bool) error {
	_, err := db.Exec(
		`UPDATE stores SET store_name=?, description=?, logo_cid=?, banner_cid=?, store_type=?,
		        categories=?, settings=?, is_active=?
		 WHERE id=? AND owner_wallet=?`,
		storeName, description, logoCid, bannerCid, storeType, categories, settings, isActive, id, ownerWallet,
	)
	return err
}

func DeleteStore(id int64, ownerWallet string) error {
	_, err := db.Exec(`DELETE FROM stores WHERE id=? AND owner_wallet=?`, id, ownerWallet)
	return err
}

func GetStoreMembers(storeID int64) ([]StoreMember, error) {
	rows, err := db.Query(
		`SELECT id, store_id, user_wallet, role, COALESCE(permissions,'{}'), COALESCE(invited_by,''), joined_at
		 FROM store_members WHERE store_id=? ORDER BY role, joined_at`,
		storeID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var members []StoreMember
	for rows.Next() {
		var m StoreMember
		if err := rows.Scan(&m.ID, &m.StoreID, &m.UserWallet, &m.Role, &m.Permissions, &m.InvitedBy, &m.JoinedAt); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, rows.Err()
}

func AddStoreMember(storeID int64, userWallet, role, invitedBy string) error {
	_, err := db.Exec(
		`INSERT INTO store_members (store_id, user_wallet, role, invited_by) VALUES (?, ?, ?, ?)
		 ON CONFLICT(store_id, user_wallet) DO UPDATE SET role=excluded.role`,
		storeID, userWallet, role, invitedBy,
	)
	return err
}

func RemoveStoreMember(storeID int64, userWallet string) error {
	_, err := db.Exec(`DELETE FROM store_members WHERE store_id=? AND user_wallet=? AND role != 'owner'`, storeID, userWallet)
	return err
}

func GetStoreAnalytics(storeID int64, days int) ([]StoreAnalytics, error) {
	rows, err := db.Query(
		`SELECT id, store_id, date, views, orders, revenue, visitors
		 FROM store_analytics WHERE store_id=?
		 ORDER BY date DESC LIMIT ?`,
		storeID, days,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var analytics []StoreAnalytics
	for rows.Next() {
		var a StoreAnalytics
		if err := rows.Scan(&a.ID, &a.StoreID, &a.Date, &a.Views, &a.Orders, &a.Revenue, &a.Visitors); err != nil {
			return nil, err
		}
		analytics = append(analytics, a)
	}
	return analytics, rows.Err()
}

func RecordStoreView(storeID int64) error {
	today := time.Now().UTC().Format("2006-01-02")
	_, err := db.Exec(
		`INSERT INTO store_analytics (store_id, date, views, visitors) VALUES (?, ?, 1, 1)
		 ON CONFLICT(store_id, date) DO UPDATE SET views=views+1`,
		storeID, today,
	)
	return err
}

// ─── Store Product DB Functions ─────────────────────────────────────────────

func CreateStoreProduct(storeID int64, ownerWallet, title, description, shortDescription string, priceUsdc float64, category, imageUrl string, moq, leadTimeDays int64, rating float64, sellerTier string) (int64, error) {
	result, err := db.Exec(
		`INSERT INTO products (vendor_wallet, title, description, short_description, price_usdc, category, image_url, in_stock, moq, lead_time_days, rating, seller_tier, store_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?, true, ?, ?, ?, ?, ?)`,
		ownerWallet, title, description, shortDescription, priceUsdc, category, imageUrl, moq, leadTimeDays, rating, sellerTier, storeID,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func GetProductsByStore(storeID int64) ([]Product, error) {
	rows, err := db.Query(
		`SELECT id, vendor_wallet, title, COALESCE(description,''), COALESCE(short_description,''), price_usdc, COALESCE(category,''), COALESCE(image_url,''), in_stock,
		        COALESCE(moq,1), COALESCE(lead_time_days,7), COALESCE(rating,4.5), COALESCE(seller_tier,'wholesaler'), created_at
		 FROM products WHERE store_id=? ORDER BY created_at DESC`,
		storeID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var products []Product
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.VendorWallet, &p.Title, &p.Description, &p.ShortDescription,
			&p.PriceUsdc, &p.Category, &p.ImageUrl, &p.InStock, &p.MOQ, &p.LeadTimeDays, &p.Rating, &p.SellerTier, &p.CreatedAt); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, rows.Err()
}

func UpdateStoreProduct(id, storeID int64, title, description, shortDescription string, priceUsdc float64, category, imageUrl string, inStock bool, moq, leadTimeDays int64, rating float64, sellerTier string) error {
	_, err := db.Exec(
		`UPDATE products SET title=?, description=?, short_description=?, price_usdc=?, category=?, image_url=?, in_stock=?, moq=?, lead_time_days=?, rating=?, seller_tier=?
		 WHERE id=? AND store_id=?`,
		title, description, shortDescription, priceUsdc, category, imageUrl, inStock, moq, leadTimeDays, rating, sellerTier, id, storeID,
	)
	return err
}

func DeleteStoreProduct(id, storeID int64, ownerWallet string) error {
	_, err := db.Exec(`DELETE FROM products WHERE id=? AND store_id=? AND vendor_wallet=?`, id, storeID, ownerWallet)
	return err
}

// ─── Promotion DB Functions ─────────────────────────────────────────────────

func CreatePromotion(storeID int64, code, promoType string, value, minOrder float64, maxUses int64, startsAt, endsAt, description string) (int64, error) {
	result, err := db.Exec(
		`INSERT INTO promotions (store_id, code, promo_type, value, min_order, max_uses, starts_at, ends_at, description)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		storeID, code, promoType, value, minOrder, maxUses, startsAt, endsAt, description,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func GetPromotionsByStore(storeID int64) ([]Promotion, error) {
	rows, err := db.Query(
		`SELECT id, store_id, COALESCE(code,''), promo_type, value, min_order, max_uses, uses_count,
		        COALESCE(starts_at,''), COALESCE(ends_at,''), is_active, COALESCE(description,''), created_at
		 FROM promotions WHERE store_id=? ORDER BY created_at DESC`,
		storeID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var promos []Promotion
	for rows.Next() {
		var p Promotion
		if err := rows.Scan(&p.ID, &p.StoreID, &p.Code, &p.PromoType, &p.Value, &p.MinOrder,
			&p.MaxUses, &p.UsesCount, &p.StartsAt, &p.EndsAt, &p.IsActive, &p.Description, &p.CreatedAt); err != nil {
			return nil, err
		}
		promos = append(promos, p)
	}
	return promos, rows.Err()
}

func DeletePromotion(id, storeID int64) error {
	_, err := db.Exec(`DELETE FROM promotions WHERE id=? AND store_id=?`, id, storeID)
	return err
}

func SearchProducts(searchTerm string) ([]Product, error) {
	query := "%" + searchTerm + "%"
	rows, err := db.Query(
		`SELECT id, vendor_wallet, title, COALESCE(description,''), COALESCE(short_description,''), price_usdc, COALESCE(category,''), COALESCE(image_url,''), in_stock,
		        COALESCE(moq,1), COALESCE(lead_time_days,7), COALESCE(rating,4.5), COALESCE(seller_tier,'wholesaler'), created_at
		 FROM products
		 WHERE (title LIKE ? OR description LIKE ?) AND in_stock = true
		 ORDER BY created_at DESC`,
		query, query,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.VendorWallet, &p.Title, &p.Description, &p.ShortDescription, &p.PriceUsdc, &p.Category, &p.ImageUrl, &p.InStock, &p.MOQ, &p.LeadTimeDays, &p.Rating, &p.SellerTier, &p.CreatedAt); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, rows.Err()
}
func GetFilteredProducts(category, tier string, minRating float64) ([]Product, error) {
	query := `SELECT id, vendor_wallet, title, COALESCE(description,''), COALESCE(short_description,''), price_usdc, COALESCE(category,''), COALESCE(image_url,''), in_stock,
		        COALESCE(moq,1), COALESCE(lead_time_days,7), COALESCE(rating,4.5), COALESCE(seller_tier,'wholesaler'), created_at
		 FROM products
		 WHERE in_stock = true`
	var args []interface{}

	if category != "" && category != "all" {
		query += " AND category = ?"
		args = append(args, category)
	}
	if tier != "" && tier != "all" {
		query += " AND seller_tier = ?"
		args = append(args, tier)
	}
	if minRating > 0 {
		query += " AND rating >= ?"
		args = append(args, minRating)
	}

	query += " ORDER BY created_at DESC"

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.VendorWallet, &p.Title, &p.Description, &p.ShortDescription, &p.PriceUsdc, &p.Category, &p.ImageUrl, &p.InStock, &p.MOQ, &p.LeadTimeDays, &p.Rating, &p.SellerTier, &p.CreatedAt); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, rows.Err()
}
