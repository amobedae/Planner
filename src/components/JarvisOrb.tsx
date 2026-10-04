type Props = { size?: number; active?: boolean };

/** Jarvis's animated "presence" — concentric rings that pulse while thinking. */
export function JarvisOrb({ size = 56, active = false }: Props) {
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} aria-hidden>
      <span className={`absolute inset-0 rounded-full bg-brand/20 ${active ? 'animate-ping' : 'animate-orb-breathe'}`} />
      <svg viewBox="0 0 64 64" width={size} height={size} className="relative">
        <defs>
          <radialGradient id="orb-core" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#c3b4ff" />
            <stop offset="100%" stopColor="#6d5bd0" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="#1d1830" />
        <circle
          cx="32"
          cy="32"
          r="24"
          fill="none"
          stroke="#a390f5"
          strokeWidth="2.5"
          strokeDasharray="20 8"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          className={active ? 'animate-[spin_1.2s_linear_infinite]' : 'animate-[spin_12s_linear_infinite]'}
        />
        <circle
          cx="32"
          cy="32"
          r="17"
          fill="none"
          stroke="#6fb0ea"
          strokeWidth="2"
          strokeDasharray="6 5"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          className={active ? 'animate-[spin_1.8s_linear_infinite_reverse]' : 'animate-[spin_18s_linear_infinite_reverse]'}
        />
        <circle cx="32" cy="32" r="10" fill="url(#orb-core)" />
      </svg>
    </span>
  );
}
