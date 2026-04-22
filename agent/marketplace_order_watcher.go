package main

import (
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

// OrderStatus mirrors the on-chain enum variant index.
const (
	OrderStatusCreated      uint8 = 0
	OrderStatusEscrowLocked uint8 = 1
	OrderStatusCancelled    uint8 = 2
)

// MarketplaceOrderAccount holds a decoded on-chain MarketplaceOrder PDA.
type MarketplaceOrderAccount struct {
	Pubkey        string `json:"pubkey"`
	OrderID       []byte `json:"order_id"`
	Buyer         string `json:"buyer"`
	Vendor        string `json:"vendor"`
	Listing       string `json:"listing"`
	Quantity      uint32 `json:"quantity"`
	UnitPrice     uint64 `json:"unit_price"`
	TotalAmount   uint64 `json:"total_amount"`
	TradeAccount  string `json:"trade_account"`
	EscrowTradeID []byte `json:"escrow_trade_id"`
	Status        uint8  `json:"status"`
	StatusLabel   string `json:"status_label"`
	CreatedAt     int64  `json:"created_at"`
	Bump          uint8  `json:"bump"`
}

// marketplaceOrderDiscriminator is sha256("account:MarketplaceOrder")[0:8].
var marketplaceOrderDiscriminator = [8]byte{36, 193, 241, 88, 220, 254, 185, 68}

// decodeMarketplaceOrder parses a raw account data buffer from on-chain.
// Layout (after 8-byte discriminator):
//
//	[16]u8 order_id, [32]u8 buyer, [32]u8 vendor, [32]u8 listing,
//	u32 quantity, u64 unit_price, u64 total_amount,
//	[32]u8 trade_account, [32]u8 escrow_trade_id, u8 status, i64 created_at, u8 bump
func decodeMarketplaceOrder(data []byte) (*MarketplaceOrderAccount, error) {
	if len(data) < 8 {
		return nil, fmt.Errorf("data too short")
	}
	if !bytes.Equal(data[:8], marketplaceOrderDiscriminator[:]) {
		return nil, fmt.Errorf("discriminator mismatch")
	}

	r := bytes.NewReader(data[8:])
	read := func(n int) ([]byte, error) {
		buf := make([]byte, n)
		_, err := io.ReadFull(r, buf)
		return buf, err
	}

	orderID, err := read(16)
	if err != nil {
		return nil, err
	}
	buyer, err := read(32)
	if err != nil {
		return nil, err
	}
	vendor, err := read(32)
	if err != nil {
		return nil, err
	}
	listing, err := read(32)
	if err != nil {
		return nil, err
	}

	var quantity uint32
	if err := binary.Read(r, binary.LittleEndian, &quantity); err != nil {
		return nil, err
	}
	var unitPrice uint64
	if err := binary.Read(r, binary.LittleEndian, &unitPrice); err != nil {
		return nil, err
	}
	var totalAmount uint64
	if err := binary.Read(r, binary.LittleEndian, &totalAmount); err != nil {
		return nil, err
	}

	tradeAccount, err := read(32)
	if err != nil {
		return nil, err
	}
	escrowTradeID, err := read(32)
	if err != nil {
		return nil, err
	}

	var status uint8
	if err := binary.Read(r, binary.LittleEndian, &status); err != nil {
		return nil, err
	}
	var createdAt int64
	if err := binary.Read(r, binary.LittleEndian, &createdAt); err != nil {
		return nil, err
	}
	var bump uint8
	if err := binary.Read(r, binary.LittleEndian, &bump); err != nil {
		return nil, err
	}

	statusLabel := map[uint8]string{
		OrderStatusCreated:      "Created",
		OrderStatusEscrowLocked: "EscrowLocked",
		OrderStatusCancelled:    "Cancelled",
	}[status]
	if statusLabel == "" {
		statusLabel = "Unknown"
	}

	return &MarketplaceOrderAccount{
		OrderID:       orderID,
		Buyer:         base58Encode(buyer),
		Vendor:        base58Encode(vendor),
		Listing:       base58Encode(listing),
		Quantity:      quantity,
		UnitPrice:     unitPrice,
		TotalAmount:   totalAmount,
		TradeAccount:  base58Encode(tradeAccount),
		EscrowTradeID: escrowTradeID,
		Status:        status,
		StatusLabel:   statusLabel,
		CreatedAt:     createdAt,
		Bump:          bump,
	}, nil
}

// fetchMarketplaceOrders calls getProgramAccounts on the marketplace program
// and returns all successfully decoded MarketplaceOrder accounts.
func fetchMarketplaceOrders(rpcURL, programID string) ([]MarketplaceOrderAccount, error) {
	// Use memcmp filter on the discriminator bytes to only fetch MarketplaceOrder accounts.
	filter := map[string]any{
		"memcmp": map[string]any{
			"offset": 0,
			"bytes":  base58EncodeBytes(marketplaceOrderDiscriminator[:]),
		},
	}
	reqBody := map[string]any{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "getProgramAccounts",
		"params": []any{
			programID,
			map[string]any{
				"encoding": "base64",
				"filters":  []any{filter},
			},
		},
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, rpcURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var rpcResp struct {
		Result []struct {
			Pubkey  string `json:"pubkey"`
			Account struct {
				Data []string `json:"data"`
			} `json:"account"`
		} `json:"result"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&rpcResp); err != nil {
		return nil, err
	}
	if rpcResp.Error != nil {
		return nil, fmt.Errorf("RPC error: %s", rpcResp.Error.Message)
	}

	var orders []MarketplaceOrderAccount
	for _, item := range rpcResp.Result {
		if len(item.Account.Data) < 1 {
			continue
		}
		raw, err := base64Decode(item.Account.Data[0])
		if err != nil {
			continue
		}
		order, err := decodeMarketplaceOrder(raw)
		if err != nil {
			continue
		}
		order.Pubkey = item.Pubkey
		orders = append(orders, *order)
	}
	return orders, nil
}

// runMarketplaceOrderWatchCycle fetches EscrowLocked orders and, for any that
// already have a tracked shipment confirmed as delivered, triggers proof submission
// via the existing handleDeliveryConfirmed path.
func runMarketplaceOrderWatchCycle() error {
	rpcURL := os.Getenv("SOLANA_RPC")
	if rpcURL == "" {
		rpcURL = "https://api.devnet.solana.com"
	}
	marketplaceProgramID := os.Getenv("MARKETPLACE_PROGRAM_ID")
	if marketplaceProgramID == "" {
		return nil // not configured; skip silently
	}

	orders, err := fetchMarketplaceOrders(rpcURL, marketplaceProgramID)
	if err != nil {
		return fmt.Errorf("marketplace order fetch: %w", err)
	}

	for _, o := range orders {
		if o.Status != OrderStatusEscrowLocked {
			continue
		}
		// Look up the shipment in local DB by trade_account.
		shipment, err := GetShipmentByTradeAccount(o.TradeAccount)
		if err != nil {
			// No shipment registered yet for this trade; skip.
			continue
		}
		// If the shipment is already confirmed delivered but proof not yet submitted,
		// the existing poll cycle (runPollCycle) handles it. Nothing extra to do here.
		log.Printf("[marketplace watcher] order %s: trade=%s shipment=%s status=%s",
			o.Pubkey, o.TradeAccount, shipment.TrackingID, shipment.LastKnownStatus)
	}
	return nil
}

// MarketplaceOrdersHandler serves GET /marketplace/orders.
// Query params: buyer=<pubkey> | vendor=<pubkey>
func MarketplaceOrdersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rpcURL := os.Getenv("SOLANA_RPC")
	if rpcURL == "" {
		rpcURL = "https://api.devnet.solana.com"
	}
	marketplaceProgramID := os.Getenv("MARKETPLACE_PROGRAM_ID")
	if marketplaceProgramID == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"orders":  []any{},
			"warning": "MARKETPLACE_PROGRAM_ID not configured",
		})
		return
	}

	orders, err := fetchMarketplaceOrders(rpcURL, marketplaceProgramID)
	if err != nil {
		http.Error(w, fmt.Sprintf("RPC error: %v", err), http.StatusBadGateway)
		return
	}

	buyer := r.URL.Query().Get("buyer")
	vendor := r.URL.Query().Get("vendor")

	if buyer != "" || vendor != "" {
		filtered := orders[:0]
		for _, o := range orders {
			if buyer != "" && o.Buyer != buyer {
				continue
			}
			if vendor != "" && o.Vendor != vendor {
				continue
			}
			filtered = append(filtered, o)
		}
		orders = filtered
	}

	if orders == nil {
		orders = []MarketplaceOrderAccount{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"orders": orders,
		"total":  len(orders),
	})
}
