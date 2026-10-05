import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt =
  "O Pequeno Príncipe — Vicente Mateus, 1 ano. Uma pequena grande aventura sob as estrelas.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const illustrationData = await readFile(
  join(process.cwd(), "public/illustrations/prince-telescope.png"),
  "base64",
);
const illustrationSrc = `data:image/png;base64,${illustrationData}`;

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background:
          "radial-gradient(ellipse at 35% 54%, #344858 0%, #1c304a 30%, #102137 72%)",
        color: "#f1e6cd",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 24,
          border: "1px solid rgba(203,177,122,.42)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 76,
          left: 92,
          width: 7,
          height: 7,
          borderRadius: 10,
          background: "#d5bb80",
          boxShadow: "890px 110px 0 1px #d5bb80, 95px 420px 0 #d5bb80",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: "100%",
          padding: "44px 72px",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 620,
            height: 540,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 440,
              height: 440,
              borderRadius: 300,
              background:
                "radial-gradient(circle, rgba(198,197,176,.22), rgba(198,197,176,0) 70%)",
            }}
          />
          <img
            src={illustrationSrc}
            width={600}
            height={480}
            style={{ width: 600, height: 480, objectFit: "contain" }}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: 430,
            paddingLeft: 22,
          }}
        >
          <div
            style={{
              color: "#d5bb80",
              fontSize: 17,
              letterSpacing: 3,
            }}
          >
            VICENTE MATEUS · 1 ANO
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 18,
              fontFamily: "Georgia, serif",
              fontSize: 56,
              lineHeight: 1.08,
              letterSpacing: -1,
              color: "#f6eace",
            }}
          >
            <span>O Pequeno</span>
            <span>Príncipe</span>
          </div>
          <div
            style={{
              width: 70,
              height: 1,
              marginTop: 22,
              background: "#cbb17a",
            }}
          />
          <div
            style={{
              maxWidth: 370,
              marginTop: 18,
              color: "#c6c9ca",
              fontFamily: "Georgia, serif",
              fontSize: 21,
              lineHeight: 1.4,
            }}
          >
            Uma pequena grande aventura sob as estrelas.
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
