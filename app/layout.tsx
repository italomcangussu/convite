import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-poppins",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.SITE_URL || "http://localhost:3000",
  ),
  title: "Vicente Mateus — 1 ano",
  description:
    "Você está convidado para viver conosco uma pequena grande aventura.",
  openGraph: {
    title: "Vicente Mateus — 1 ano",
    description: "Uma pequena grande aventura sob as estrelas.",
    images: ["/og.svg"],
  },
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
