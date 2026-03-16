import type { Metadata } from "next";
import ThemeProvider from "@/components/ThemeProvider";
import WipBanner from "@/components/WipBanner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "WorldWideView Marketplace",
    template: "%s | WWV Marketplace",
  },
  description:
    "Browse, publish, and install data source plugins for WorldWideView — the real-time 3D globe intelligence platform.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "WorldWideView Marketplace",
    description:
      "Browse, publish, and install data source plugins for the real-time 3D globe intelligence platform.",
    siteName: "WorldWideView Marketplace",
    type: "website",
    locale: "en_US",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          defer
          src="https://analytics.worldwideview.dev/script.js"
          data-website-id="b70ed34b-4361-490b-9a66-1e43bb74f4ec"
        />
      </head>
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <ThemeProvider>
          <WipBanner />
          <Header />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
