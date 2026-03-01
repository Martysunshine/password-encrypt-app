interface LockStateIconProps {
  unlocked: boolean;
  className?: string;
}

export function LockStateIcon({ unlocked, className }: LockStateIconProps): JSX.Element {
  const shacklePath = unlocked
    ? "M11 9V7.7C11 5.1 13.2 3 15.9 3C18.6 3 20.8 5.1 20.8 7.7"
    : "M11 9V7.7C11 5.1 13.2 3 15.9 3C18.6 3 20.8 5.1 20.8 7.7V9";

  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={shacklePath}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.8"
      />
      <rect
        x="7"
        y="9"
        width="18"
        height="15"
        rx="4"
        fill="currentColor"
      />
      <circle cx="16" cy="16.5" r="2.1" fill="#8fd9cf" />
      <rect x="15.1" y="18.4" width="1.8" height="3.2" rx="0.8" fill="#8fd9cf" />
      <rect x="7" y="22.4" width="18" height="1.8" rx="0.9" fill="#62cdbf" />
    </svg>
  );
}
