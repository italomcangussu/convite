import Image from "next/image";
import { useId } from "react";

function InkPlanet() {
  const id = useId();
  return (
    <svg
      className="scene scene-4 ink-planet"
      viewBox="0 0 400 350"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <filter id={id}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".55"
            numOctaves="3"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope=".14" />
          </feComponentTransfer>
          <feComposite in2="SourceAlpha" operator="in" />
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>
      </defs>
      <g
        className="floating-planet"
        stroke="#464d49"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M112 125c26-30 66-37 101-31 38 2 69 20 82 50 9 19 9 35 5 60 12 35-13 60-30 75-23 16-57 28-86 19-26 3-55-11-70-31-21-13-32-37-28-62-7-27 9-65 26-80z"
          fill="#a4bab0"
          filter={`url(#${id})`}
        />
        <path
          d="M105 133c17-23 34-29 51-34M218 99c33 6 61 20 70 46M107 257c18 24 35 31 49 34"
          stroke="#dcdbc0"
          strokeWidth="1"
          opacity=".55"
        />
        <path
          d="M132 160c-14-2-20 9-13 16 8 5 22 4 23-5 0-5-5-9-10-11zM230 235c-15-3-25 6-20 13 6 10 24 10 33 4 10-10-3-16-13-17zM249 138c-4-1-8 3-6 6 4 5 12 1 9-3zM146 244c-3-6-11-4-9 1 0 5 13 8 9-1z"
          fill="#718f88"
        />
        <path
          d="m152 138-5 8m10-5-4 9M265 222l-3 7m8-4-2 6M175 277l-1 5m5-6-2 5M121 211l-2 5"
          opacity=".7"
        />
        <path
          d="M78 245c-17-13 7-40 27-51m189-47c41-8 63 3 49 24-19 29-75 49-126 65-58 18-110 25-139 9"
          stroke="#d1b881"
          strokeWidth="3"
        />
        <path
          d="M81 247c39 14 110-3 148-17 61-21 104-44 117-63"
          stroke="#f1d9a2"
          strokeWidth=".8"
        />
        <path d="m273 72 4-14 5 13 13 4-12 5-5 13-5-12-13-5z" fill="#d6b775" />
        <path d="m83 101 3-9 4 8 8 3-8 4-4 8-3-8-8-4z" fill="#d6b775" />
        <path
          d="M318 257c18-2 26-13 24-30-4 7-12 13-20 12 6 8 5 14-4 18z"
          fill="#d6b775"
        />
      </g>
    </svg>
  );
}
export default function Scene({ variant = 0 }: { variant?: number }) {
  if (variant === 4) return <InkPlanet />;
  const source =
    variant === 2
      ? "rose-moon"
      : variant === 3
        ? "prince-flight"
        : "prince-telescope";
  return (
    <div
      className={`scene illustration-scene scene-${variant}`}
      aria-hidden="true"
    >
      <Image
        src={`/illustrations/${source}.png`}
        alt=""
        fill
        sizes="(max-width: 500px) 340px, 380px"
        loading={variant === 0 || variant === 1 ? "eager" : "lazy"}
        style={{ objectFit: "contain" }}
        draggable={false}
      />
    </div>
  );
}
