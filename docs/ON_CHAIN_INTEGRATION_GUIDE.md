# On-Chain Submission Integration Guide

This guide provides step-by-step instructions for testing the automated on-chain proof submission flow for the AETHER-LOGOS platform on Solana Devnet.

---

## 🚀 Overview

The AETHER-LOGOS agent monitors shipments. When a shipment is marked "Delivered", the agent:
1. Generates a **zkTLS Proof** (via Reclaim Protocol).
2. Submits this proof **On-Chain** to the `trade-escrow` smart contract.
3. This triggers the automated release of funds from escrow.

---

## 🛠️ Step 1: Extract Your Solana Private Key

The agent needs a Solana private key (in Base58 format) to sign and submit the on-chain transactions.

1. Locate your devnet keypair (usually at `~/.config/solana/id.json`).
2. Run the following command to extract the Base58 private key:

```powershell
node -e "const bs58=require('bs58');const fs=require('fs');const kp=JSON.parse(fs.readFileSync('$HOME/.config/solana/id.json'));console.log(bs58.encode(Buffer.from(kp.slice(0,32))))"
```

*Note: If you don't have Node.js or `bs58` installed, you can use any Solana utility tool to export the Base58 string.*

---

## ⚙️ Step 2: Configure Environment Variables

Update `agent/.env` with the following keys:

```env
# The trade-escrow program ID on Devnet
TRADE_ESCROW_PROGRAM_ID=EVn3aVUGYbx6yvHa5h4m5N3qfJkhKm1FnYeNsfbi34CZ

# Your extracted Base58 private key
SOLANA_PRIVATE_KEY_BASE58=your_extracted_key_here

# Enable mock mode for testing
MOCK_PROOF=true
```

---

## 🧪 Step 3: Run the End-to-End Test

1. **Start the Agent**:
   ```powershell
   cd agent
   $env:MOCK_PROOF="true"
   go run .
   ```

2. **Register a Test Shipment**:
   Send a POST request to `http://localhost:8080/register` with a `MOCK-` prefix:
   ```powershell
   Invoke-RestMethod -Uri http://localhost:8080/register -Method Post -ContentType "application/json" -Body '{"tracking_id": "MOCK-TX-101", "wallet": "YourWalletAddr", "callback_url": "http://localhost:8080/notify", "carrier": "dhl", "trade_account": "YourTradeAccountAddr", "trade_id": "YourTradeIDHex"}'
   ```

3. **Wait for Polling**:
   Every 30 seconds, the agent polls. Since the tracking ID starts with `MOCK-`, it will instantly return "Delivered". The agent will then:
   - Generate a mock zkTLS proof.
   - Submit it on-chain to the program ID specified.

4. **Verify On-Chain**:
   Check the agent logs for a Solana transaction signature (TxSig). You can view the transaction on [Solana Explorer](https://explorer.solana.com/?cluster=devnet).

---

## ❓ Troubleshooting

- **Error: bind: Only one usage of each socket address**: Kill the process on port 8080 using `Taskkill /F /IM go.exe`.
- **Error: account not found**: Ensure your `TRADE_ESCROW_PROGRAM_ID` and `trade_account` are correctly set and exist on Devnet.
- **On-chain submission failed**: Check that your Solana wallet has enough Devnet SOL for transaction fees.

---

*AETHER-LOGOS — Trade Settlement Platform*
