export default function InkStar({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`ink-star ${className}`}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        pathLength={1}
        d="m16.1 2.8 3.4 9.7 9.7 3.8-9.4 3.3-3.7 9.7-3.6-9.3-9.7-3.7 9.7-3.7z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m16.8 6.3 2.5 6.9 7.1 2.8M12.9 19.6l2.8 7.3"
        stroke="currentColor"
        strokeWidth=".5"
        opacity=".6"
      />
    </svg>
  );
}
