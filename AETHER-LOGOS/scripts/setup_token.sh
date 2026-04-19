#!/bin/bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

echo "Creating Mock USDC Mint (6 decimals)..."
MINT_OUTPUT=$(spl-token create-token --decimals 6)
MINT_ADDRESS=$(echo "$MINT_OUTPUT" | grep "Address:" | awk '{print $2}')

if [ -z "$MINT_ADDRESS" ]; then
    echo "Failed to create mint. Check if validator is running."
    exit 1
fi

echo "Mock USDC Mint created: $MINT_ADDRESS"

echo "Creating Token Account for CLI wallet..."
spl-token create-account "$MINT_ADDRESS"

echo "Minting 10,000 mock USDC to CLI wallet..."
spl-token mint "$MINT_ADDRESS" 10000

echo "Exporting constants to frontend..."
cat <<EOF > app/src/lib/constants.ts
import { PublicKey } from '@solana/web3.js';

export const USDC_MINT = new PublicKey("$MINT_ADDRESS");
export const TRADE_ESCROW_PROGRAM_ID = new PublicKey("6LaqcgUheXF2AVdGZRrh2gWanwDLmr1hcQhmDmt9rHcc");
export const PREDICTION_MARKET_PROGRAM_ID = new PublicKey("BWvCzv6ZymKHRqVGFxWeEekvgiN1hvDKDg1C3LHEPpYX");
EOF

echo "Token setup complete."
