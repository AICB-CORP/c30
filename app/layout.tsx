import type { Metadata } from "next";
import { Dancing_Script, Press_Start_2P } from "next/font/google";
import "./globals.css";

const dancingScript = Dancing_Script({
  variable: "--font-retro-cursive",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const pressStart = Press_Start_2P({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Skyblog des 30 ans",
  description: "Le blog du 30e anniversaire — un cadeau collectif.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${dancingScript.variable} ${pressStart.variable} h-full`}>
      <body className="min-h-full sparkle-cursor">{children}</body>
    </html>
  );
}
