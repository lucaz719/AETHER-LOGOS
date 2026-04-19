#!/bin/bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20

echo "Solana version:"
solana --version

echo "Stopping any existing local validator..."
pkill -f solana-test-validator

echo "Starting local validator in background..."
solana-test-validator --reset > validator.log 2>&1 &
VALIDATOR_PID=$!

echo "Validator started (PID $VALIDATOR_PID). Waiting 10 seconds for it to fully spin up..."
sleep 10

echo "Configuring solana CLI for localnet..."
solana config set --url localhost

echo "Airdropping 1000 SOL to deployment wallet..."
solana airdrop 1000

echo "Building Anchor programs (if needed)..."
anchor build

echo "Deploying programs to local validator..."
anchor deploy

echo "Syncing IDLs to frontend application..."
mkdir -p app/src/lib/anchor/idl
mkdir -p app/src/lib/anchor/types

cp target/idl/*.json app/src/lib/anchor/idl/ 2>/dev/null || true
cp target/types/*.ts app/src/lib/anchor/types/ 2>/dev/null || true

echo "Localnet infrastructure is ready. Programs deployed."
echo "Validator is running in background (PID $VALIDATOR_PID)."
