import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-poppins",
  display: "swap",
});
// Same colour as the night sky: Safari tints the status bar and the toolbar
// with it, so there is no light strip around the book on the iPhone.
export const viewport: Viewport = {
  themeColor: "#091421",
  colorScheme: "dark",
};
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.SITE_URL || "http://localhost:3000",
  ),
  title: "Vicente Mateus — 1 ano",
  description:
    "Você está convidado para viver conosco uma pequena grande aventura.",
  openGraph: {
    title: "O Pequeno Príncipe — Vicente Mateus · 1 ano",
    description: "Uma pequena grande aventura sob as estrelas.",
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
