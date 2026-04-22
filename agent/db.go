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
