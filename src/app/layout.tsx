import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://malete-kits.vercel.app"),
  title: "MALÈTE KITS — Football Jerseys in Malete, Kwara State",
  description:
    "Affordable, quality football jerseys for KWASU students and Malete residents. Club & national team shirts with name/number customization. Order online, pay on confirmation — transfer or cash. Pickup or delivery in Malete.",
  keywords: ["football jersey", "Malete", "KWASU", "Kwara State", "jersey store", "Nigeria", "Malète Kits"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/mk-icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "MALÈTE KITS — Football Jerseys in Malete",
    description: "Club & national team jerseys with customization. Order online, pay on confirmation.",
    siteName: "MALÈTE KITS",
    locale: "en_NG",
    type: "website",
    images: [
      {
        url: "/images/og-cover.png",
        width: 1200,
        height: 630,
        alt: "MALÈTE KITS — premium football jerseys, Malete, Kwara State",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MALÈTE KITS — Football Jerseys in Malete",
    description: "Club & national team jerseys with customization. Order online, pay on confirmation.",
    images: ["/images/og-cover.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#17191C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground font-sans">
        {children}
        <Toaster />
        <Sonner position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
