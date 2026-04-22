const fs = require("fs");

function normalizeName(name) {
  return String(name ?? "")
    .replace(/[_\-\s]/g, "")
    .toLowerCase();
}

function buildTypeLookup(types) {
  const byName = new Map();
  for (const typeDef of types) {
    if (!typeDef?.name || !typeDef?.type) continue;
    byName.set(typeDef.name, typeDef);
    byName.set(normalizeName(typeDef.name), typeDef);
  }
  return byName;
}

function findMatchingType(typeLookup, accountName) {
  const normalized = normalizeName(accountName);
  if (typeLookup.has(accountName)) return typeLookup.get(accountName);
  if (typeLookup.has(normalized)) return typeLookup.get(normalized);
  return null;
}

function patchIdl(idlPath, outputPath) {
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));

  if (Array.isArray(idl.accounts) && Array.isArray(idl.types)) {
    const typeLookup = buildTypeLookup(idl.types);
    idl.accounts = idl.accounts.map((account) => {
      const typeDef = findMatchingType(typeLookup, account.name);
      if (typeDef && typeDef.type) {
        return { ...account, type: typeDef.type };
      }
      return account;
    });
  }

  fs.writeFileSync(outputPath, JSON.stringify(idl, null, 2));
  console.log(`Patched IDL written to ${outputPath}`);

  const patched = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  patched.accounts.forEach((a) => {
    const fieldCount = a.type?.fields?.length ?? 0;
    console.log(`  ${a.name}: ${fieldCount} fields`);
  });
}

patchIdl("./target/idl/trade_escrow.json", "./target/idl/trade_escrow.json");
patchIdl(
  "./target/idl/prediction_market.json",
  "./target/idl/prediction_market.json",
);
patchIdl("./target/idl/marketplace.json", "./target/idl/marketplace.json");
