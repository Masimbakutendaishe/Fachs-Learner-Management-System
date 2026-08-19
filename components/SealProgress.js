export default function SealProgress({ percent = 0, size = 64, label, sublabel }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="4"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--seal-gold)"
            strokeWidth="4"
            strokeLinecap="round"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
              "--seal-circumference": circumference,
              "--seal-offset": offset,
              animation: "seal-draw 1s cubic-bezier(0.16, 1, 0.3, 1) both",
            }}
          />
        </svg>
        <span className="absolute font-mono text-xs font-medium text-white">
          {Math.round(percent)}%
        </span>
      </div>
      {(label || sublabel) && (
        <div>
          {label && <p className="text-sm font-medium text-white">{label}</p>}
          {sublabel && <p className="text-xs text-[var(--text-muted)] font-mono">{sublabel}</p>}
        </div>
      )}
    </div>
  );
}