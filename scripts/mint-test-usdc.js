const fs = require('fs');
const { Connection, Keypair, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const { createMint, getOrCreateAssociatedTokenAccount, mintTo, getAccount } = require('@solana/spl-token');

(async ()=>{
  try {
    const keypairPath = 'C:\\Users\\suraj\\.config\\solana\\id.json';
    const phantom = 'CG7PTGNd3z1R4z3qxsDuNQeST3EcSnGg7HsdGapQUZeL';
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const secret = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    const secretKey = Uint8Array.from(secret);
    const payer = Keypair.fromSecretKey(secretKey);
    console.log('Payer:', payer.publicKey.toBase58());

    const rawArgs = process.argv.slice(2);
    let mintArg = null;
    let amountArg = 300;
    for (let i = 0; i < rawArgs.length; i++) {
      const a = rawArgs[i];
      if (a === '--mint' && rawArgs[i + 1]) { mintArg = rawArgs[i + 1]; i++; }
      else if ((a === '--amount' || a === '-a') && rawArgs[i + 1]) { amountArg = rawArgs[i + 1]; i++; }
      else if (!mintArg) { mintArg = a; }
    }

    let mint;
    if (mintArg) {
      mint = new PublicKey(mintArg);
      console.log('Using existing mint:', mint.toBase58());
    } else {
      console.log('Creating mint (6 decimals)...');
      mint = await createMint(connection, payer, payer.publicKey, null, 6);
      console.log('Mint created:', mint.toBase58());
    }

    console.log('Creating/getting ATA for Phantom...');
    const ata = await getOrCreateAssociatedTokenAccount(connection, payer, mint, new PublicKey(phantom));
    console.log('ATA:', ata.address.toBase58());

    const amountUnits = BigInt(Math.floor(Number(amountArg) * (10 ** 6)));
    console.log(`Minting ${amountArg} tokens (${amountUnits.toString()} raw units)...`);
    await mintTo(connection, payer, mint, ata.address, payer, amountUnits);
    console.log('Minted.');

    const acct = await getAccount(connection, ata.address);
    console.log('Account amount (raw):', acct.amount.toString());
    console.log('Done. Paste mint address into the store UI (Set test USDC mint).');
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
