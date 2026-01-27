import type { Metadata } from "next";
import { Source_Sans_3, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/use-auth";
import { NotificationShell } from "@/components/notifications/notification-shell";

const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const bodyFont = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ChessPro — Play. Learn. Compete.",
  description:
    "ChessPro is a modern chess web app with AI coaching, puzzles, and leagues designed to keep you playing longer.",
  icons: {
    icon: "/icons8-chess-30.png",
    apple: "/icons8-chess.svg",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable} antialiased`}>
        <AuthProvider>
          <NotificationShell />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
