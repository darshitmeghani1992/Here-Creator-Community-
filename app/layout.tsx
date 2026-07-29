import type { Metadata, Viewport } from "next";
import {
  Inter,
  Poppins,
  Space_Grotesk,
  DM_Sans,
  Fraunces,
} from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "@/components/PostHogProvider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

// Personalization fonts a creator can pick for their space (lib/appearance.ts).
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-dmsans",
  display: "swap",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-fraunces",
  display: "swap",
});

const fontVars = [
  inter.variable,
  poppins.variable,
  grotesk.variable,
  dmSans.variable,
  fraunces.variable,
].join(" ");

export const metadata: Metadata = {
  title: "HERE",
  description: "One link. A live space.",
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HERE",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontVars}>
      <body style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
