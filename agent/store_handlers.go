package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// storeDispatch routes /api/stores/* and /api/vendors/* store-related requests.
func storeDispatch(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	// ── /api/vendors/:wallet/stores ──────────────────────────────────────
	if strings.HasPrefix(path, "/api/vendors/") {
		tail := strings.TrimPrefix(path, "/api/vendors/")
		parts := strings.SplitN(tail, "/", 3)
		if len(parts) == 2 && parts[1] == "stores" {
			VendorStoresHandler(w, r, parts[0])
			return
		}
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	// ── /api/stores/* ────────────────────────────────────────────────────
	tail := strings.TrimPrefix(path, "/api/stores/")
	parts := strings.SplitN(tail, "/", 4)

	// POST /api/stores (no trailing segment)
	if path == "/api/stores" || path == "/api/stores/" {
		if r.Method == http.MethodPost {
			StoreCreateHandler(w, r)
		} else {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	storeIDStr := parts[0]
	storeID, err := parseStoreID(storeIDStr)
	if err != nil {
		http.Error(w, "invalid store id", http.StatusBadRequest)
		return
	}

	// /api/stores/:id  (GET, PUT, DELETE)
	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			StoreGetHandler(w, r, storeID)
		case http.MethodPut:
			StoreUpdateHandler(w, r, storeID)
		case http.MethodDelete:
			StoreDeleteHandler(w, r, storeID)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	subResource := parts[1]

	switch subResource {
	case "members":
		// /api/stores/:id/members[/:wallet]
		if len(parts) == 2 {
			StoreMembersListHandler(w, r, storeID)
		} else {
			StoreMemberRemoveHandler(w, r, storeID, parts[2])
		}
	case "products":
		// /api/stores/:id/products[/:prodID]
		if len(parts) == 2 {
			StoreProductsHandler(w, r, storeID)
		} else {
			prodID, perr := strconv.ParseInt(parts[2], 10, 64)
			if perr != nil {
				http.Error(w, "invalid product id", http.StatusBadRequest)
				return
			}
			StoreProductHandler(w, r, storeID, prodID)
		}
	case "analytics":
		StoreAnalyticsHandler(w, r, storeID)
	case "promotions":
		if len(parts) == 2 {
			StorePromotionsHandler(w, r, storeID)
		} else {
			promoID, perr := strconv.ParseInt(parts[2], 10, 64)
			if perr != nil {
				http.Error(w, "invalid promotion id", http.StatusBadRequest)
				return
			}
			StorePromotionDeleteHandler(w, r, storeID, promoID)
		}
	default:
		http.Error(w, "not found", http.StatusNotFound)
	}
}

// POST /api/stores
func StoreCreateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		OwnerWallet string `json:"owner_wallet"`
		Slug        string `json:"slug"`
		StoreName   string `json:"store_name"`
		Description string `json:"description"`
		StoreType   string `json:"store_type"`
		Categories  string `json:"categories"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}
	if req.OwnerWallet == "" || req.StoreName == "" || req.Slug == "" {
		http.Error(w, "owner_wallet, store_name and slug are required", http.StatusBadRequest)
		return
	}
	if req.StoreType == "" {
		req.StoreType = "retail"
	}

	id, err := CreateStore(req.OwnerWallet, req.Slug, req.StoreName, req.Description, req.StoreType, req.Categories)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			http.Error(w, "store slug already taken", http.StatusConflict)
			return
		}
		log.Printf("store create error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "store_id": id})
}

// GET /api/stores/:id
func StoreGetHandler(w http.ResponseWriter, r *http.Request, storeID int64) {
	store, err := GetStoreByID(storeID)
	if err != nil {
		http.Error(w, "store not found", http.StatusNotFound)
		return
	}
	_ = RecordStoreView(storeID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(store)
}

// PUT /api/stores/:id
func StoreUpdateHandler(w http.ResponseWriter, r *http.Request, storeID int64) {
	var req struct {
		OwnerWallet string `json:"owner_wallet"`
		StoreName   string `json:"store_name"`
		Description string `json:"description"`
		LogoCid     string `json:"logo_cid"`
		BannerCid   string `json:"banner_cid"`
		StoreType   string `json:"store_type"`
		Categories  string `json:"categories"`
		Settings    string `json:"settings"`
		IsActive    bool   `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}
	if err := UpdateStore(storeID, req.OwnerWallet, req.StoreName, req.Description,
		req.LogoCid, req.BannerCid, req.StoreType, req.Categories, req.Settings, req.IsActive); err != nil {
		log.Printf("store update error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// DELETE /api/stores/:id
func StoreDeleteHandler(w http.ResponseWriter, r *http.Request, storeID int64) {
	ownerWallet := r.URL.Query().Get("owner_wallet")
	if ownerWallet == "" {
		http.Error(w, "owner_wallet query param required", http.StatusBadRequest)
		return
	}
	if err := DeleteStore(storeID, ownerWallet); err != nil {
		log.Printf("store delete error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/vendors/:wallet/stores
func VendorStoresHandler(w http.ResponseWriter, r *http.Request, wallet string) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	stores, err := GetStoresByOwner(wallet)
	if err != nil {
		log.Printf("vendor stores error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if stores == nil {
		stores = []Store{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"stores": stores, "count": len(stores)})
}

// GET /api/stores/:id/members
func StoreMembersListHandler(w http.ResponseWriter, r *http.Request, storeID int64) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if r.Method == http.MethodPost {
		var req struct {
			UserWallet string `json:"user_wallet"`
			Role       string `json:"role"`
			InvitedBy  string `json:"invited_by"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid JSON", http.StatusBadRequest)
			return
		}
		if req.UserWallet == "" {
			http.Error(w, "user_wallet is required", http.StatusBadRequest)
			return
		}
		if req.Role == "" {
			req.Role = "staff"
		}
		if err := AddStoreMember(storeID, req.UserWallet, req.Role, req.InvitedBy); err != nil {
			log.Printf("add member error: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]bool{"success": true})
		return
	}
	members, err := GetStoreMembers(storeID)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if members == nil {
		members = []StoreMember{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"members": members, "count": len(members)})
}

// DELETE /api/stores/:id/members/:wallet
func StoreMemberRemoveHandler(w http.ResponseWriter, r *http.Request, storeID int64, memberWallet string) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if err := RemoveStoreMember(storeID, memberWallet); err != nil {
		log.Printf("remove member error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/stores/:id/products
// POST /api/stores/:id/products
func StoreProductsHandler(w http.ResponseWriter, r *http.Request, storeID int64) {
	switch r.Method {
	case http.MethodGet:
		products, err := GetProductsByStore(storeID)
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		if products == nil {
			products = []Product{}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"products": products, "count": len(products)})

	case http.MethodPost:
		var req struct {
			OwnerWallet string  `json:"owner_wallet"`
			Title       string  `json:"title"`
			Description string  `json:"description"`
			PriceUsdc   float64 `json:"price_usdc"`
			Category    string  `json:"category"`
			ImageUrl    string  `json:"image_url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid JSON", http.StatusBadRequest)
			return
		}
		if req.Title == "" || req.PriceUsdc <= 0 || req.OwnerWallet == "" {
			http.Error(w, "owner_wallet, title and price_usdc are required", http.StatusBadRequest)
			return
		}
		id, err := CreateStoreProduct(storeID, req.OwnerWallet, req.Title, req.Description,
			req.PriceUsdc, req.Category, req.ImageUrl)
		if err != nil {
			log.Printf("store product create error: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "product_id": id})

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// PUT /api/stores/:id/products/:prodID
// DELETE /api/stores/:id/products/:prodID
func StoreProductHandler(w http.ResponseWriter, r *http.Request, storeID, prodID int64) {
	switch r.Method {
	case http.MethodPut:
		var req struct {
			Title       string  `json:"title"`
			Description string  `json:"description"`
			PriceUsdc   float64 `json:"price_usdc"`
			Category    string  `json:"category"`
			ImageUrl    string  `json:"image_url"`
			InStock     bool    `json:"in_stock"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid JSON", http.StatusBadRequest)
			return
		}
		if err := UpdateStoreProduct(prodID, storeID, req.Title, req.Description,
			req.PriceUsdc, req.Category, req.ImageUrl, req.InStock); err != nil {
			log.Printf("store product update error: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"success": true})

	case http.MethodDelete:
		ownerWallet := r.URL.Query().Get("owner_wallet")
		if ownerWallet == "" {
			http.Error(w, "owner_wallet query param required", http.StatusBadRequest)
			return
		}
		if err := DeleteStoreProduct(prodID, storeID, ownerWallet); err != nil {
			log.Printf("store product delete error: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// GET /api/stores/:id/analytics
func StoreAnalyticsHandler(w http.ResponseWriter, r *http.Request, storeID int64) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	days := 30
	if d := r.URL.Query().Get("days"); d != "" {
		if n, err := strconv.Atoi(d); err == nil && n > 0 && n <= 365 {
			days = n
		}
	}
	analytics, err := GetStoreAnalytics(storeID, days)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if analytics == nil {
		analytics = []StoreAnalytics{}
	}

	// Aggregate totals
	var totalViews, totalOrders, totalVisitors int64
	var totalRevenue float64
	for _, a := range analytics {
		totalViews += a.Views
		totalOrders += a.Orders
		totalRevenue += a.Revenue
		totalVisitors += a.Visitors
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"daily":          analytics,
		"total_views":    totalViews,
		"total_orders":   totalOrders,
		"total_revenue":  totalRevenue,
		"total_visitors": totalVisitors,
	})
}

// GET /api/stores/:id/promotions
// POST /api/stores/:id/promotions
func StorePromotionsHandler(w http.ResponseWriter, r *http.Request, storeID int64) {
	switch r.Method {
	case http.MethodGet:
		promos, err := GetPromotionsByStore(storeID)
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		if promos == nil {
			promos = []Promotion{}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"promotions": promos, "count": len(promos)})

	case http.MethodPost:
		var req struct {
			Code        string  `json:"code"`
			PromoType   string  `json:"promo_type"`
			Value       float64 `json:"value"`
			MinOrder    float64 `json:"min_order"`
			MaxUses     int64   `json:"max_uses"`
			StartsAt    string  `json:"starts_at"`
			EndsAt      string  `json:"ends_at"`
			Description string  `json:"description"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid JSON", http.StatusBadRequest)
			return
		}
		if req.PromoType == "" {
			req.PromoType = "discount"
		}
		id, err := CreatePromotion(storeID, req.Code, req.PromoType, req.Value, req.MinOrder,
			req.MaxUses, req.StartsAt, req.EndsAt, req.Description)
		if err != nil {
			log.Printf("promotion create error: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "promotion_id": id})

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// DELETE /api/stores/:id/promotions/:promoID
func StorePromotionDeleteHandler(w http.ResponseWriter, r *http.Request, storeID, promoID int64) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if err := DeletePromotion(promoID, storeID); err != nil {
		log.Printf("promotion delete error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func parseStoreID(s string) (int64, error) {
	id, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid store id: %s", s)
	}
	return id, nil
}
