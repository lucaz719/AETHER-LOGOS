const MARKETPLACE_STEPS = ["Created", "EscrowLocked", "Shipped", "Delivered", "Complete"];
const ESCROW_STATUS_MAP: Record<string, number> = {
  AwaitingShipment: 1,
  InTransit: 2,
  Verified: 3,
  Released: 4,
  Cancelled: -1,
  Disputed: -2,
};

function stepIndex(orderStatus: string, escrowStatus?: string): number {
  if (escrowStatus) {
    const mapped = ESCROW_STATUS_MAP[escrowStatus];
    if (mapped !== undefined) return Math.max(mapped, 0);
  }
  switch (orderStatus) {
    case "Created": return 0;
    case "EscrowLocked": return 1;
    case "Cancelled": return -1;
    default: return 0;
  }
}

export function OrderStatusStepper({
  orderStatus,
  escrowStatus,
}: {
  orderStatus: string;
  escrowStatus?: string;
}) {
  const current = stepIndex(orderStatus, escrowStatus);
  const isCancelled = orderStatus === "Cancelled" || escrowStatus === "Cancelled";

  if (isCancelled) {
    return (
      <div className="badge badge-red" style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem" }}>
        ✕ Order Cancelled
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0", overflowX: "auto" }}>
      {MARKETPLACE_STEPS.map((step, idx) => (
        <div key={step} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 64 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", flex: 1 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: idx < current
                  ? "var(--cyan)"
                  : idx === current
                  ? "var(--cyan-dim)"
                  : "var(--bg-elevated)",
                border: idx <= current
                  ? "1.5px solid var(--cyan)"
                  : "1.5px solid var(--border)",
                color: idx < current
                  ? "var(--text-inverse)"
                  : idx === current
                  ? "var(--cyan)"
                  : "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                fontWeight: 700,
                boxShadow: idx <= current ? "0 0 8px rgba(0,212,255,0.35)" : "none",
                transition: "all var(--transition)",
              }}
            >
              {idx < current ? "✓" : idx + 1}
            </div>
            <span
              style={{
                fontSize: "0.6rem",
                color: idx <= current ? "var(--cyan)" : "var(--text-muted)",
                textAlign: "center",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              {step}
            </span>
          </div>
          {idx < MARKETPLACE_STEPS.length - 1 && (
            <div
              style={{
                height: 2,
                flex: 1,
                background: idx < current ? "var(--cyan)" : "var(--border)",
                boxShadow: idx < current ? "0 0 6px rgba(0,212,255,0.4)" : "none",
                marginBottom: "1rem",
                minWidth: 12,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

