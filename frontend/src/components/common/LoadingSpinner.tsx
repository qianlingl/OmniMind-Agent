interface Props {
  size?: number;
  color?: string;
  label?: string;
  style?: React.CSSProperties;
}

export default function LoadingSpinner({ size = 20, color, label, style }: Props) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      color: color || 'var(--text-muted)',
      ...style,
    }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeOpacity="0.2"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      {label && <span style={{ fontSize: 13 }}>{label}</span>}
    </div>
  );
}

export function PageLoader({ label = '加载中...' }: { label?: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '50vh',
      gap: 12,
    }}>
      <LoadingSpinner size={28} />
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}
