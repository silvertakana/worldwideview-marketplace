import type { Metadata } from "next";
import ClientProviders from "@/components/ClientProviders";
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("wwv-marketplace-theme")||"system";var r=t;if(t==="system"){r=window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",r)}catch(e){}})();`,
          }}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          defer
          src="https://analytics.worldwideview.dev/script.js"
          data-website-id="66565d0f-5206-4fa6-91b6-3159b67bf866"
        />
      </head>
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <ClientProviders>
          <WipBanner />
          <Header />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </ClientProviders>
      </body>
    </html>
  );
}
