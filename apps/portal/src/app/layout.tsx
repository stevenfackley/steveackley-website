import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Steve Ackley Portal",
  description: "Authenticated admin and client portal for steveackley.org",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
