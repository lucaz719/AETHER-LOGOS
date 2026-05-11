export const STATUS_MAP: Record<string, {
  label: string
  color: string
  bg: string
  border?: string
}> = {
  Pending: { label: 'Pending', color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' },
  AwaitingShipment: {
    label: 'Awaiting Shipment',
    color: '#FCD34D',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.24)',
  },
  InTransit: { label: 'In Transit', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' },
  Verified: { label: 'Verified', color: '#34D399', bg: 'rgba(52,211,153,0.1)' },
  Released: { label: 'Settled', color: '#22D3EE', bg: 'rgba(34,211,238,0.1)' },
  Disputed: { label: 'Disputed', color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
  Resolved: { label: 'Resolved', color: '#818CF8', bg: 'rgba(129,140,248,0.1)' },
  Cancelled: { label: 'Cancelled', color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
}

export function getStatusKey(status: unknown): string {
  if (!status) return 'AwaitingShipment'
  if (typeof status === 'string') {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }
  if (typeof status === 'object') {
    const key = Object.keys(status as Record<string, unknown>)[0]
    return key ? key.charAt(0).toUpperCase() + key.slice(1) : 'AwaitingShipment'
  }
  return 'AwaitingShipment'
}

export function getStatusMeta(status: unknown) {
  const key = getStatusKey(status)
  return STATUS_MAP[key] ?? STATUS_MAP.Pending
}
