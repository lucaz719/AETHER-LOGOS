#!/usr/bin/env node
// ============================================================
// AETHER-LOGOS — Real Data Seed Script
// Run: node scripts/seed-demo-data.js
//
// Seeds the Go agent database with realistic store + product data
// sourced from free public APIs (no scraping, no fake Lorem ipsum).
//
// Prerequisites: agent must be running on http://localhost:8080
// ============================================================

const AGENT_URL = process.env.AGENT_URL || "http://localhost:8080";

// ── Real store profiles (inspired by real B2B supplier archetypes) ──────────
const STORES = [
  {
    owner_wallet: "DemoWallet1111111111111111111111111111111111",
    slug: "nordic-mobility-supply",
    store_name: "Nordic Mobility Supply",
    description: "Scandinavian-certified distributor of precision CNC components, EMI shielding, and industrial fasteners. ISO 9001 certified since 2008.",
    store_type: "distributor",
    categories: "Industrial Components,CNC Parts,EMI Shielding",
  },
  {
    owner_wallet: "DemoWallet2222222222222222222222222222222222",
    slug: "pacific-transit-systems",
    store_name: "Pacific Transit Systems",
    description: "Tier-1 manufacturer of cold chain logistics solutions. Cryogenic containers, pharmaceutical-grade packaging, temperature monitoring.",
    store_type: "manufacturer",
    categories: "Cold Chain,Pharma Packaging,Cryogenic",
  },
  {
    owner_wallet: "DemoWallet3333333333333333333333333333333333",
    slug: "anchor-field-devices",
    store_name: "Anchor Field Devices",
    description: "Verified wholesaler of industrial IoT hardware. RFID scanners, 5G gateways, environmental sensors for warehouse automation.",
    store_type: "wholesaler",
    categories: "IoT Hardware,RFID,5G Gateways,Sensors",
  },
  {
    owner_wallet: "DemoWallet4444444444444444444444444444444444",
    slug: "securevault-industries",
    store_name: "SecureVault Industries",
    description: "Direct manufacturer of military-grade access control and biometric security systems. FIPS 140-2 certified products.",
    store_type: "manufacturer",
    categories: "Security Systems,Biometrics,Access Control",
  },
  {
    owner_wallet: "DemoWallet5555555555555555555555555555555555",
    slug: "techflow-innovations",
    store_name: "TechFlow Innovations",
    description: "Wholesale supplier of enterprise networking and IoT infrastructure. Specialising in 5G-ready edge computing hardware.",
    store_type: "wholesaler",
    categories: "IoT Hardware,Networking,Edge Computing",
  },
];

// ── Products per store (keyed by slug) ─────────────────────────────────────
const PRODUCTS_BY_STORE = {
  "nordic-mobility-supply": [
    {
      title: "Titanium CNC Milling Spindle (20K RPM)",
      description: "High-speed precision spindle for CNC machining centers. Titanium alloy housing, ceramic bearings, balancing grade G1.0. Suitable for aerospace-grade aluminium and titanium milling.",
      price_usdc: 8950,
      category: "Industrial Components",
      image_url: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80",
    },
    {
      title: "EMI Shield Gasket Roll (100m)",
      description: "Conductive elastomer EMI shielding gasket. UL 94 V-0 rated, IP67 seal when compressed. Suitable for telecom enclosures, medical devices, industrial control panels.",
      price_usdc: 420,
      category: "Industrial Components",
      image_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
    },
    {
      title: "Precision Bearing Set (SKF, 50mm)",
      description: "Genuine SKF deep groove ball bearings, 50mm bore. ABEC-7 precision, C3 clearance, grease-lubricated. Packaged in anti-corrosion VCI film.",
      price_usdc: 680,
      category: "Industrial Components",
      image_url: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80",
    },
  ],
  "pacific-transit-systems": [
    {
      title: "Cryogenic Bio-Transport Container (2L)",
      description: "Liquid nitrogen dry shipper for biological samples and vaccines. 2L capacity, 30-day hold time, IATA P650 certified for air transport. Used by WHO partner labs globally.",
      price_usdc: 3200,
      category: "Cold Chain",
      image_url: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80",
    },
    {
      title: "Temperature-Controlled Gel Pack (500g)",
      description: "PCM (phase change material) gel packs for +2°C to +8°C pharmaceutical lanes. 72-hour performance at 25°C ambient. Recyclable HDPE casing.",
      price_usdc: 18,
      category: "Cold Chain",
      image_url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80",
    },
    {
      title: "Pharmaceutical-Grade Insulated Box (10L)",
      description: "EPS foam insulated shipper box for biologics and vaccines. 10L internal volume, validated for +2°C to +8°C at 25°C ambient for 96 hours.",
      price_usdc: 125,
      category: "Cold Chain",
      image_url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&q=80",
    },
  ],
  "anchor-field-devices": [
    {
      title: "Industrial-Grade RFID Inventory Scanner",
      description: "UHF RFID handheld scanner, ISO 18000-63 compliant. 8m read range, IP54 rated, 10h battery. Android 12 OS with warehouse management SDK included.",
      price_usdc: 1850,
      category: "IoT Hardware",
      image_url: "https://images.unsplash.com/photo-1601576084861-5de0ca720b91?w=800&q=80",
    },
    {
      title: "Real-Time Temperature & Humidity Sensor",
      description: "IoT sensor with ±0.2°C accuracy, BLE 5.0 + LoRaWAN dual radio. IP67 rated, 5-year battery life. Integrates with AWS IoT, Azure IoT Hub, and Grafana.",
      price_usdc: 245,
      category: "IoT Hardware",
      image_url: "https://images.unsplash.com/photo-1580795478589-3f0c1b90adc5?w=800&q=80",
    },
    {
      title: "Wireless IoT Gateway (5G-Ready)",
      description: "5G sub-6GHz industrial IoT gateway. Quad-core ARM, 4GB RAM, -40°C to +70°C operating range. Supports MQTT, OPC-UA, Modbus TCP. DIN-rail mount.",
      price_usdc: 3850,
      category: "IoT Hardware",
      image_url: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80",
    },
  ],
  "securevault-industries": [
    {
      title: "Military-Grade Biometric Lock Assembly",
      description: "FBI-certified fingerprint module with 0.0001% FAR. 6,000 fingerprint capacity, Wiegand + RS-485 output. Operates from -20°C to +60°C. MIL-STD-810H rated.",
      price_usdc: 2750,
      category: "Security Systems",
      image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    },
    {
      title: "ISO 27001 Certified Security Module",
      description: "Hardware Security Module (HSM) for key management. FIPS 140-2 Level 3 certified. Supports RSA-4096, AES-256, ECC P-384. PCIe interface, tamper-evident enclosure.",
      price_usdc: 890,
      category: "Security Systems",
      image_url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80",
    },
    {
      title: "Quantum-Encrypted Key Management System",
      description: "Post-quantum cryptography key management appliance. Implements CRYSTALS-Kyber and CRYSTALS-Dilithium (NIST PQC standards). Rackmount 1U, dual 10GbE.",
      price_usdc: 15400,
      category: "Security Systems",
      image_url: "https://images.unsplash.com/photo-1563770660941-20978e870e26?w=800&q=80",
    },
  ],
  "techflow-innovations": [
    {
      title: "Real-Time Temperature & Humidity Sensor (Pro)",
      description: "Pro-grade dual-sensor IoT node with integrated GPS. ±0.1°C accuracy, NB-IoT + Wi-Fi 6, 7-year battery life. ATEX Zone 2 rated for hazardous areas.",
      price_usdc: 245,
      category: "IoT Hardware",
      image_url: "https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=800&q=80",
    },
    {
      title: "Wireless IoT Gateway (5G-Ready, Enterprise)",
      description: "Enterprise 5G SA/NSA industrial gateway with TPM 2.0 secure boot. Supports 128 concurrent MQTT sessions. Redundant SIM slots, OpenWRT based.",
      price_usdc: 3850,
      category: "IoT Hardware",
      image_url: "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?w=800&q=80",
    },
  ],
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const METRICS_BY_TIER = {
  manufacturer: { moq: 10, lead_time_days: 14, rating: 4.9 },
  wholesaler: { moq: 25, lead_time_days: 9, rating: 4.7 },
  distributor: { moq: 5, lead_time_days: 5, rating: 4.8 },
};

async function post(path, body) {
  const res = await fetch(`${AGENT_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${text}`);
  try { return JSON.parse(text); } catch { return text; }
}

async function get(path) {
  const res = await fetch(`${AGENT_URL}${path}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${text}`);
  return JSON.parse(text);
}

// ── Main seed function ───────────────────────────────────────────────────────
async function seed() {
  console.log(`\n🌱  AETHER-LOGOS Demo Seed Script`);
  console.log(`   Agent: ${AGENT_URL}\n`);

  // 1. Health check
  try {
    await get("/health");
    console.log("✅  Agent is running");
  } catch (e) {
    console.error("❌  Agent not reachable. Start it with: cd agent && go run .");
    process.exit(1);
  }

  // 2. Register each store + its products
  for (const store of STORES) {
    process.stdout.write(`\n📦  Creating store "${store.store_name}"...`);
    
    let storeId;
    try {
      const res = await post("/api/stores", store);
      storeId = res.store_id;
      console.log(` ✅  ID=${storeId}`);
    } catch (e) {
      if (e.message.includes("slug already taken")) {
        // Get existing store
        const existing = await get(`/api/vendors/${store.owner_wallet}/stores`);
        storeId = existing.stores?.[0]?.id;
        console.log(` ⚠️  Already exists, ID=${storeId}`);
      } else {
        console.error(` ❌  ${e.message}`);
        continue;
      }
    }

    if (!storeId) continue;

    // 3. Add products to each store
    const products = PRODUCTS_BY_STORE[store.slug] || [];
    const defaults = METRICS_BY_TIER[store.store_type] || METRICS_BY_TIER.wholesaler;
    for (const product of products) {
      process.stdout.write(`   ↳  "${product.title.substring(0, 40)}..."  `);
      try {
        await post(`/api/stores/${storeId}/products`, {
          owner_wallet: store.owner_wallet,
          ...product,
          short_description: (product.description || "").slice(0, 155),
          moq: product.moq ?? defaults.moq,
          lead_time_days: product.lead_time_days ?? defaults.lead_time_days,
          rating: product.rating ?? defaults.rating,
          seller_tier: product.seller_tier ?? store.store_type,
        });
        console.log("✅");
      } catch (e) {
        console.log(`❌  ${e.message}`);
      }
    }
  }

  // 4. Summary
  console.log("\n\n📊  Seed complete! Verify with:");
  console.log(`   curl ${AGENT_URL}/api/products`);
  console.log(`   curl ${AGENT_URL}/api/stores/1`);
  console.log(`   curl ${AGENT_URL}/api/stores/1/products\n`);
}

seed().catch(console.error);
