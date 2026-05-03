# AETHER-LOGOS Shipping Monitor Agent

Lightweight Go agent that polls carrier APIs, detects shipment status changes,
and notifies merchants via webhook — triggering the zkTLS proof generation flow.

## Quick Start

```bash
cd agent
go run .
```

The server listens on port **8080** by default. Override with `PORT=9090 go run .`

## Environment

- `RECLAIM_APP_ID` and `RECLAIM_APP_SECRET` enable the real Reclaim zkTLS flow.
- `MOCK_PROOF=true` enables hackathon mock mode, bypasses Reclaim network calls,
  and returns a synthetic proof payload after a short delay.

## API

| Method | Path        | Description                              |
|--------|-------------|------------------------------------------|
| POST   | `/register` | Register a shipment for tracking         |
| GET    | `/poll`     | Poll carriers and detect status changes  |
| POST   | `/notify`   | Send a webhook to a merchant callback    |
| GET    | `/health`   | Health check                             |

### POST /register

```json
{
  "tracking_id": "1Z999AA10123456784",
  "wallet": "0xabc...123",
  "callback_url": "https://merchant.example.com/webhook",
  "carrier": "ups"
}
```

### GET /poll

Iterates all non-delivered shipments, fetches the latest carrier status, and
sends a webhook notification when a change is detected. Returns a summary:

```json
{
  "checked": 5,
  "updated": 2,
  "errors": 0,
  "changes": [
    { "tracking_id": "1Z999AA1...", "old_status": "In Transit", "new_status": "Delivered" }
  ]
}
```

### GET /health

```json
{ "status": "ok" }
```

## Architecture

- **main.go** — Entry point; HTTP server and route registration.
- **db.go** — SQLite persistence layer (shipments table).
- **handlers.go** — HTTP request handlers.
- **carrier.go** — Carrier API client (mock for hackathon).

## Dependencies

- Go 1.22+
- `github.com/mattn/go-sqlite3` (CGO-based SQLite driver)

## Notes

The carrier client currently returns mock data that cycles through:
`Picked Up → In Transit → Out for Delivery → Delivered`.
Replace with real DHL/FedEx/UPS API calls for production use.
