import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VNR Pool - Ride Sharing for VNR VJIET",
  description: "Hyperlocal ride-pooling and carpooling platform for VNR VJIET college students.",
};

import { Footer } from "@/components/Footer";
import { SWRegister } from "@/components/SWRegister";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground min-h-screen antialiased flex flex-col overflow-x-hidden`}>
        <Providers>
          <SWRegister />
          <div className="flex-1">
            {children}
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
