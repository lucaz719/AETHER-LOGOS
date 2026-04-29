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
  const getStatusIcon = (status: "completed" | "active" | "pending"): string => {
    switch (status) {
      case "completed":
        return "✓";
      case "active":
        return "◉";
      case "pending":
        return "○";
    }
  };

  const getStatusColor = (status: "completed" | "active" | "pending"): string => {
    switch (status) {
      case "completed":
        return "bg-green-500/30 border-green-500/50 text-green-400";
      case "active":
        return "bg-purple-500/30 border-purple-500/50 text-purple-400";
      case "pending":
        return "bg-gray-500/20 border-gray-500/50 text-gray-400";
    }
  };

  return (
    <div className="space-y-4">
      {milestones.map((m, i) => (
        <div key={`${m.label}-${i}`} className="flex items-start gap-4">
          {/* Timeline dot and connector */}
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${getStatusColor(
                m.status
              )}`}
            >
              {getStatusIcon(m.status)}
            </div>
            {i < milestones.length - 1 && (
              <div className={`w-0.5 h-12 mt-2 ${m.status === "completed" ? "bg-green-500/50" : "bg-gray-500/20"}`} />
            )}
          </div>
          {/* Content */}
          <div className="flex-1 pt-1">
            <p className="text-sm font-medium text-white">{m.label}</p>
            {m.timestamp && <p className="text-xs text-gray-400 mt-1">{m.timestamp}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
