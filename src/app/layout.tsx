import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CRM Comercial — Gambit Labs",
  description: "Plataforma de gestão comercial",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt" className="h-full">
      <body className={`${geist.className} h-full bg-gray-50 antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
