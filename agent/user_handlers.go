package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// POST /api/users/register
func UserRegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		WalletAddress string `json:"wallet_address"`
		UserType      string `json:"user_type"`
		Username      string `json:"username"`
		EmailHash     string `json:"email_hash"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}
	if req.WalletAddress == "" {
		http.Error(w, "wallet_address is required", http.StatusBadRequest)
		return
	}
	if req.UserType == "" {
		req.UserType = "buyer"
	}

	id, err := CreateUser(req.WalletAddress, req.UserType, req.Username, req.EmailHash)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			// Return existing user instead of error
			user, getErr := GetUserByWallet(req.WalletAddress)
			if getErr != nil {
				http.Error(w, "internal error", http.StatusInternalServerError)
				return
			}
			_ = TouchUserLogin(req.WalletAddress)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(user)
			return
		}
		log.Printf("user register error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	_ = TouchUserLogin(req.WalletAddress)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "user_id": id, "wallet_address": req.WalletAddress})
}

// GET /api/users/:wallet
func UserGetHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	wallet := extractPathSegment(r.URL.Path, "/api/users/")
	if wallet == "" || strings.Contains(wallet, "/") {
		http.Error(w, "wallet is required", http.StatusBadRequest)
		return
	}
	user, err := GetUserByWallet(wallet)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// PUT /api/users/:wallet
func UserUpdateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	wallet := extractPathSegment(r.URL.Path, "/api/users/")
	if wallet == "" || strings.Contains(wallet, "/") {
		http.Error(w, "wallet is required", http.StatusBadRequest)
		return
	}
	var req struct {
		UserType         string `json:"user_type"`
		Username         string `json:"username"`
		Bio              string `json:"bio"`
		ProfileImageCid  string `json:"profile_image_cid"`
		PreferredCurrency string `json:"preferred_currency"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}
	if err := UpdateUser(wallet, req.UserType, req.Username, req.Bio, req.ProfileImageCid, req.PreferredCurrency); err != nil {
		log.Printf("user update error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// DELETE /api/users/:wallet
func UserDeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	wallet := extractPathSegment(r.URL.Path, "/api/users/")
	if wallet == "" || strings.Contains(wallet, "/") {
		http.Error(w, "wallet is required", http.StatusBadRequest)
		return
	}
	if err := DeleteUser(wallet); err != nil {
		log.Printf("user delete error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/users/:wallet/addresses
// POST /api/users/:wallet/addresses
func UserAddressesHandler(w http.ResponseWriter, r *http.Request) {
	// Path: /api/users/:wallet/addresses
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/users/"), "/")
	if len(parts) < 2 || parts[1] != "addresses" {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	wallet := parts[0]

	switch r.Method {
	case http.MethodGet:
		addresses, err := GetUserAddresses(wallet)
		if err != nil {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		if addresses == nil {
			addresses = []UserAddress{}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(addresses)

	case http.MethodPost:
		var req struct {
			AddressType   string `json:"address_type"`
			RecipientName string `json:"recipient_name"`
			Street        string `json:"street"`
			City          string `json:"city"`
			StateProvince string `json:"state_province"`
			PostalCode    string `json:"postal_code"`
			Country       string `json:"country"`
			Phone         string `json:"phone"`
			IsDefault     bool   `json:"is_default"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid JSON", http.StatusBadRequest)
			return
		}
		if req.AddressType == "" {
			req.AddressType = "shipping"
		}
		id, err := CreateUserAddress(wallet, req.AddressType, req.RecipientName, req.Street,
			req.City, req.StateProvince, req.PostalCode, req.Country, req.Phone, req.IsDefault)
		if err != nil {
			log.Printf("address create error: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "id": id})

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// PUT /api/users/:wallet/addresses/:id
// DELETE /api/users/:wallet/addresses/:id
func UserAddressHandler(w http.ResponseWriter, r *http.Request) {
	// Path: /api/users/:wallet/addresses/:id
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/users/"), "/")
	if len(parts) < 3 || parts[1] != "addresses" {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	wallet := parts[0]
	addrID, err := strconv.ParseInt(parts[2], 10, 64)
	if err != nil {
		http.Error(w, "invalid address id", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodPut:
		var req struct {
			AddressType   string `json:"address_type"`
			RecipientName string `json:"recipient_name"`
			Street        string `json:"street"`
			City          string `json:"city"`
			StateProvince string `json:"state_province"`
			PostalCode    string `json:"postal_code"`
			Country       string `json:"country"`
			Phone         string `json:"phone"`
			IsDefault     bool   `json:"is_default"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid JSON", http.StatusBadRequest)
			return
		}
		if err := UpdateUserAddress(addrID, wallet, req.AddressType, req.RecipientName, req.Street,
			req.City, req.StateProvince, req.PostalCode, req.Country, req.Phone, req.IsDefault); err != nil {
			log.Printf("address update error: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"success": true})

	case http.MethodDelete:
		if err := DeleteUserAddress(addrID, wallet); err != nil {
			log.Printf("address delete error: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// GET /api/users/:wallet/preferences
// PUT /api/users/:wallet/preferences
func UserPreferencesHandler(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/users/"), "/")
	if len(parts) < 2 || parts[1] != "preferences" {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	wallet := parts[0]

	switch r.Method {
	case http.MethodGet:
		prefs, err := GetUserPreferences(wallet)
		if err != nil {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(prefs)

	case http.MethodPut:
		var req struct {
			Theme              string `json:"theme"`
			Language           string `json:"language"`
			Currency           string `json:"currency"`
			EmailNotifications bool   `json:"email_notifications"`
			PushNotifications  bool   `json:"push_notifications"`
			TwoFactorEnabled   bool   `json:"two_factor_enabled"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid JSON", http.StatusBadRequest)
			return
		}
		if err := UpsertUserPreferences(wallet, req.Theme, req.Language, req.Currency,
			req.EmailNotifications, req.PushNotifications, req.TwoFactorEnabled); err != nil {
			log.Printf("preferences update error: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"success": true})

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// userDispatch routes /api/users/* requests to the appropriate handler.
func userDispatch(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	// Strip prefix and split
	tail := strings.TrimPrefix(path, "/api/users/")
	parts := strings.SplitN(tail, "/", 4)

	switch {
	// /api/users/register  (POST)
	case tail == "register":
		UserRegisterHandler(w, r)

	// /api/users/:wallet  (GET, PUT, DELETE)
	case len(parts) == 1 && parts[0] != "":
		switch r.Method {
		case http.MethodGet:
			UserGetHandler(w, r)
		case http.MethodPut:
			UserUpdateHandler(w, r)
		case http.MethodDelete:
			UserDeleteHandler(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}

	// /api/users/:wallet/addresses[/:id]
	case len(parts) >= 2 && parts[1] == "addresses":
		if len(parts) == 2 {
			UserAddressesHandler(w, r)
		} else {
			UserAddressHandler(w, r)
		}

	// /api/users/:wallet/preferences
	case len(parts) == 2 && parts[1] == "preferences":
		UserPreferencesHandler(w, r)

	default:
		http.Error(w, "not found", http.StatusNotFound)
	}
}

// extractPathSegment returns the segment after the given prefix.
func extractPathSegment(path, prefix string) string {
	s := strings.TrimPrefix(path, prefix)
	// Stop at first slash so we only get :wallet, not :wallet/sub
	if idx := strings.Index(s, "/"); idx >= 0 {
		s = s[:idx]
	}
	return strings.TrimSpace(s)
}

// Ensure fmt is used
var _ = fmt.Sprintf
