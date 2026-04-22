import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { after, before, test } from "node:test";

const PORT = 4123;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const STARTUP_TIMEOUT_MS = 120000;
const POLL_MS = 1000;
let server;

async function waitForServer() {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/markets`);
      if (res.ok) return;
    } catch {}
    await delay(POLL_MS);
  }
  throw new Error("API server did not become ready in time");
}

before(async () => {
  server = spawn(`npm run dev -- --port ${PORT}`, {
    shell: true,
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      NODE_ENV: "test",
    },
    stdio: "ignore",
  });
  server.unref();

  await waitForServer();
});

after(async () => {
  if (!server || server.killed) return;
  if (process.platform === "win32" && server.pid) {
    spawn(
      "powershell",
      ["-Command", `Stop-Process -Id ${server.pid} -Force -ErrorAction SilentlyContinue`],
      { stdio: "ignore" },
    ).unref();
  } else {
    server.kill("SIGTERM");
  }
  await delay(1500);
  if (!server.killed) server.kill("SIGKILL");
});

test("GET /api/markets returns API payload shape", async () => {
  const res = await fetch(`${BASE_URL}/api/markets`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.markets));
  assert.equal(typeof body.updatedAt, "string");
});

test("GET /api/trades rejects missing buyer/seller filter", async () => {
  const res = await fetch(`${BASE_URL}/api/trades`);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, "buyer or seller query param is required");
});

test("GET /api/trades with filter responds without blockchain dependency", async () => {
  const res = await fetch(`${BASE_URL}/api/trades?buyer=ExampleBuyer1111111111111111111111111111111`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Object.prototype.hasOwnProperty.call(body, "trades"));
  assert.equal(body.warning, "NEXT_PUBLIC_ESCROW_PROGRAM_ID not set");
});

test("GET /api/marketplace/vendors returns paginated vendor list shape", async () => {
  const res = await fetch(`${BASE_URL}/api/marketplace/vendors`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.vendors));
  assert.equal(typeof body.total, "number");
  assert.equal(typeof body.page, "number");
});

test("GET /api/marketplace/listings returns filtered results shape", async () => {
  const res = await fetch(`${BASE_URL}/api/marketplace/listings?search=widget`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.listings));
  assert.equal(typeof body.total, "number");
});

test("GET /api/marketplace/orders rejects missing buyer/vendor filter", async () => {
  const res = await fetch(`${BASE_URL}/api/marketplace/orders`);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, "buyer or vendor query param is required");
});

test("GET /api/marketplace/orders with buyer filter returns shape", async () => {
  const res = await fetch(`${BASE_URL}/api/marketplace/orders?buyer=ExampleBuyer1111111111111111111111111111111`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.orders));
  assert.equal(typeof body.total, "number");
});

