import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: {
    default: "Steve Ackley — Software Engineer",
    template: "%s | Steve Ackley",
  },
  description:
    "Steve Ackley is a full-stack software engineer with 12+ years of experience in C#, .NET, Azure, and SQL. Based in the US.",
  authors: [{ name: "Steve Ackley" }],
  creator: "Steve Ackley",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://steveackley.org",
    siteName: "Steve Ackley",
    title: "Steve Ackley — Software Engineer",
    description:
      "Full-stack software engineer with 12+ years of experience. C#, .NET, Azure, SQL.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Steve Ackley — Software Engineer",
    description:
      "Full-stack software engineer with 12+ years of experience. C#, .NET, Azure, SQL.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--background)] text-[var(--text-primary)] min-h-screen`}
      >
        <noscript>
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: "#1e293b",
            color: "#f8fafc",
            padding: "10px 16px",
            textAlign: "center",
            fontSize: "14px",
            borderBottom: "1px solid #334155",
          }}>
            This site is best viewed with JavaScript enabled. Some features, including login, are unavailable without it.
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}
