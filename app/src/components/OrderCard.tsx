import { ReactNode } from "react";

const STATUS_COLORS: Record<string, string> = {
  awaitingShipment: "#f59e0b",
  inTransit: "#2563eb",
  verified: "#16a34a",
  released: "#6b7280",
  disputed: "#dc2626",
  cancelled: "#dc2626",
};

export function OrderCard({
  title,
  amountLabel,
  status,
  trackingId,
  children,
}: {
  title: string;
  amountLabel: string;
  status: string;
  trackingId?: string;
  children?: ReactNode;
}) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: "0.9rem", display: "grid", gap: "0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>{title}</strong>
        <span
          style={{
            backgroundColor: STATUS_COLORS[status] ?? "#475569",
            color: "#fff",
            borderRadius: 9999,
            padding: "0.15rem 0.6rem",
            fontSize: "0.75rem",
          }}
        >
          {status}
        </span>
      </div>
      <div>Amount: {amountLabel}</div>
      {trackingId && <div>Tracking ID: {trackingId}</div>}
      {children}
    </div>
  );
}
