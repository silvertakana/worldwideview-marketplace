import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ClientProviders from "@/components/ClientProviders";
import ThemeProvider from "@/components/ThemeProvider";
import InstanceCapture from "@/components/InstanceCapture";
import InstanceHydrator from "@/components/InstanceHydrator";
import WipBanner from "@/components/WipBanner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

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
    <html lang="en" suppressHydrationWarning className={inter.className}>
      <head>
        {/* Raw blocking script — no async/defer — so it runs before the browser
            paints the body. next/script "beforeInteractive" is NOT render-blocking
            in App Router streaming, which caused the light-mode flash on dark loads. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("wwv-marketplace-theme")||"system";var r=t==="system"?(window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light"):t;document.documentElement.setAttribute("data-theme",r);document.documentElement.classList.add("no-transition");requestAnimationFrame(function(){requestAnimationFrame(function(){document.documentElement.classList.remove("no-transition")});})}catch(e){}})();`,
          }}
        />
        <script
          defer
          src="https://analytics.worldwideview.dev/script.js"
          data-website-id="66565d0f-5206-4fa6-91b6-3159b67bf866"
        />
      </head>
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }} suppressHydrationWarning>
        <ThemeProvider>
          <Header />
          <ClientProviders>
            <InstanceCapture />
            <InstanceHydrator />
            <WipBanner />
            <main style={{ flex: 1 }}>{children}</main>
            <Footer />
          </ClientProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
