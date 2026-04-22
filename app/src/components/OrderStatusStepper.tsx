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
      <div
        style={{
          padding: "0.5rem 1rem",
          background: "#fef2f2",
          borderRadius: 8,
          color: "#dc2626",
          fontWeight: 600,
          fontSize: "0.85rem",
        }}
      >
        ✕ Order Cancelled
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", overflowX: "auto" }}>
      {MARKETPLACE_STEPS.map((step, idx) => (
        <div key={step} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.25rem",
              minWidth: 72,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: idx <= current ? "#1e293b" : "#e2e8f0",
                color: idx <= current ? "#fff" : "#94a3b8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              {idx < current ? "✓" : idx + 1}
            </div>
            <span
              style={{
                fontSize: "0.65rem",
                color: idx <= current ? "#1e293b" : "#94a3b8",
                textAlign: "center",
                lineHeight: 1.2,
              }}
            >
              {step}
            </span>
          </div>
          {idx < MARKETPLACE_STEPS.length - 1 && (
            <div
              style={{
                flex: 1,
                height: 2,
                background: idx < current ? "#1e293b" : "#e2e8f0",
                minWidth: 24,
                marginBottom: "1.2rem",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
