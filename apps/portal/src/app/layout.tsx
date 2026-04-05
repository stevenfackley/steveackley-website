import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Steve Ackley Portal",
  description: "Authenticated admin and client portal for steveackley.org",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="portal-background" aria-hidden="true">
          <div className="portal-background-orb portal-background-orb-a" />
          <div className="portal-background-orb portal-background-orb-b" />
          <div className="portal-background-grid" />
        </div>
        {children}
      </body>
    </html>
  );
}
