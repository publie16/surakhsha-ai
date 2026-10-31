import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SurakshaAI | The Safest Walking Route for Women",
  description:
    "Proactive navigation optimizing for safety over speed. Intelligent safe routing, dynamic lighting scores, and community-powered night safety.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${fraunces.variable} ${inter.variable} font-sans bg-background text-cream antialiased min-h-screen selection:bg-terracotta selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
