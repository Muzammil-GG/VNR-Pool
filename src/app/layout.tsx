import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export const metadata: Metadata = {
  title: "VNR Pool - Ride Sharing for VNR VJIET",
  description: "Hyperlocal ride-pooling and carpooling platform for VNR VJIET college students.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VNR Pool",
  },
};

import { Footer } from "@/components/Footer";
import { SWRegister } from "@/components/SWRegister";
import { AIChatbot } from "@/components/AIChatbot";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground min-h-screen antialiased flex flex-col overflow-x-hidden relative selection:bg-blue-500 selection:text-white`}>
        <div className="aurora-bg" />
        <Providers>
          <SWRegister />
          <div className="flex-1">
            {children}
            <AIChatbot />
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
