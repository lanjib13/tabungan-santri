import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tabungan Santri | Ponpes Ihyaul Ulum Dukun Gresik",
  description: "Sistem Manajemen Tabungan Santri Pondok Pesantren Ihyaul Ulum Dukun Gresik",
  icons: {
    icon: [
      { url: "/logo1.jpeg" },
      { url: "/favicon.ico" },
      { url: "/icon.jpeg" },
    ],
    shortcut: "/logo1.jpeg",
    apple: "/logo1.jpeg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
