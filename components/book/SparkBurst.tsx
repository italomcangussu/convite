import type { CSSProperties } from "react";

/** Stardust: deterministic so server and client render the same markup. */
const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const angle = ((i * 137.5) % 360) * (Math.PI / 180);
  const reach = 70 + ((i * 37) % 90);
  return {
    dx: Math.round(Math.cos(angle) * reach),
    dy: Math.round(Math.sin(angle) * reach) - 34,
    delay: 120 + ((i * 53) % 340),
    size: 2 + (i % 3),
  };
});

export default function SparkBurst({ className = "" }: { className?: string }) {
  return (
    <div className={`spark-burst ${className}`} aria-hidden="true">
      {SPARKS.map((spark, i) => (
        <i
          key={i}
          style={
            {
              "--dx": `${spark.dx}px`,
              "--dy": `${spark.dy}px`,
              animationDelay: `${spark.delay}ms`,
              width: spark.size,
              height: spark.size,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
