type TimelineMilestone = {
  label: string;
  timestamp?: string;
  status: "completed" | "active" | "pending";
};

export function TrackingTimeline({
  milestones,
}: {
  milestones: TimelineMilestone[];
}) {
  return (
    <div style={{ display: "grid", gap: "0.35rem" }}>
      {milestones.map((m, i) => (
        <div key={`${m.label}-${i}`} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span>{m.status === "completed" ? "✅" : m.status === "active" ? "⏳" : "⬜"}</span>
          <span>{m.label}</span>
          {m.timestamp && <small style={{ opacity: 0.7 }}>({m.timestamp})</small>}
        </div>
      ))}
    </div>
  );
}
