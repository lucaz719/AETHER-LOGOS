import { ReactNode } from "react";

const STATUS_COLORS: Record<string, { badge: string; bg: string }> = {
  awaitingShipment: {
    badge: "bg-yellow-500/20 border-yellow-500/50 text-yellow-300",
    bg: "bg-yellow-500/5",
  },
  inTransit: {
    badge: "bg-blue-500/20 border-blue-500/50 text-blue-300",
    bg: "bg-blue-500/5",
  },
  verified: {
    badge: "bg-green-500/20 border-green-500/50 text-green-300",
    bg: "bg-green-500/5",
  },
  released: {
    badge: "bg-purple-500/20 border-purple-500/50 text-purple-300",
    bg: "bg-purple-500/5",
  },
  disputed: {
    badge: "bg-red-500/20 border-red-500/50 text-red-300",
    bg: "bg-red-500/5",
  },
  cancelled: {
    badge: "bg-red-500/20 border-red-500/50 text-red-300",
    bg: "bg-red-500/5",
  },
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
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.verified;

  return (
    <div className={`border border-white/10 rounded-lg p-6 ${colors.bg} hover:border-white/20 transition space-y-4`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-semibold text-white">{title}</h4>
          <p className="text-sm text-gray-400 mt-1">{amountLabel}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${colors.badge}`}>
          {status}
        </span>
      </div>
      {trackingId && (
        <div className="text-xs text-gray-400">
          <span className="text-gray-500">Tracking ID:</span> {trackingId}
        </div>
      )}
      {children && <div className="pt-2 space-y-2 text-sm">{children}</div>}
    </div>
  );
}
