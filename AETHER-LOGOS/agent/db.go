package main

import (
	"database/sql"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

var db *sql.DB

// Shipment represents a tracked shipment record.
type Shipment struct {
	ID              int64  `json:"id"`
	TrackingID      string `json:"tracking_id"`
	Wallet          string `json:"wallet"`
	CallbackURL     string `json:"callback_url"`
	Carrier         string `json:"carrier"`
	LastKnownStatus string `json:"last_known_status"`
	CreatedAt       string `json:"created_at"`
	UpdatedAt       string `json:"updated_at"`
}

// InitDB opens the SQLite database and creates the shipments table.
func InitDB(path string) error {
	var err error
	db, err = sql.Open("sqlite3", path)
	if err != nil {
		return err
	}

	schema := `
	CREATE TABLE IF NOT EXISTS shipments (
		id              INTEGER PRIMARY KEY AUTOINCREMENT,
		tracking_id     TEXT    NOT NULL,
		wallet          TEXT    NOT NULL,
		callback_url    TEXT    NOT NULL,
		carrier         TEXT    NOT NULL,
		last_known_status TEXT  NOT NULL DEFAULT '',
		created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);`

	_, err = db.Exec(schema)
	return err
}

// RegisterShipment inserts a new shipment into the database.
func RegisterShipment(trackingID, wallet, callbackURL, carrier string) (int64, error) {
	result, err := db.Exec(
		`INSERT INTO shipments (tracking_id, wallet, callback_url, carrier) VALUES (?, ?, ?, ?)`,
		trackingID, wallet, callbackURL, carrier,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// GetPendingShipments returns all shipments that have not yet been delivered.
func GetPendingShipments() ([]Shipment, error) {
	rows, err := db.Query(
		`SELECT id, tracking_id, wallet, callback_url, carrier, last_known_status, created_at, updated_at
		 FROM shipments
		 WHERE last_known_status != 'Delivered'`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shipments []Shipment
	for rows.Next() {
		var s Shipment
		if err := rows.Scan(&s.ID, &s.TrackingID, &s.Wallet, &s.CallbackURL, &s.Carrier, &s.LastKnownStatus, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		shipments = append(shipments, s)
	}
	return shipments, rows.Err()
}

// UpdateStatus sets the last_known_status and updated_at for a shipment.
func UpdateStatus(id int64, status string) error {
	_, err := db.Exec(
		`UPDATE shipments SET last_known_status = ?, updated_at = ? WHERE id = ?`,
		status, time.Now().UTC().Format(time.RFC3339), id,
	)
	return err
}

// GetShipmentStatus returns the last_known_status of a shipment by tracking_id.
func GetShipmentStatus(trackingID string) (string, error) {
	var status string
	err := db.QueryRow(`SELECT last_known_status FROM shipments WHERE tracking_id = ?`, trackingID).Scan(&status)
	if err != nil {
		return "", err
	}
	return status, nil
}
