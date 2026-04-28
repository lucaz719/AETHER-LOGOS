// ── EmptyState component ────────────────────────────────────────────────────
// A reusable "nothing here" illustration panel with icon, title, message, and
// an optional action button.

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ icon = '📭', title, message, action }: EmptyStateProps) {
  return (
    <div
      className="glass"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        textAlign: 'center',
        gap: '0.6rem',
      }}
    >
      {/* Glowing icon */}
      <div
        style={{
          fontSize: '3.5rem',
          marginBottom: '0.5rem',
          filter: 'drop-shadow(0 0 12px rgba(0,212,255,0.25))',
        }}
      >
        {icon}
      </div>

      <h3
        style={{
          fontSize: '1.05rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: 0,
        }}
      >
        {title}
      </h3>

      {message && (
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            maxWidth: 360,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {message}
        </p>
      )}

      {action && (
        action.href ? (
          <a
            href={action.href}
            className="btn-primary"
            style={{ marginTop: '1rem', textDecoration: 'none' }}
          >
            {action.label}
          </a>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={action.onClick}
            style={{ marginTop: '1rem' }}
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
