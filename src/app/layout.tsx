import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_EVENT_NAME ?? "15 Anos da Duda",
  description: "Save the Date — festa de 15 anos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
