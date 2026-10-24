import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "MALÈTE KITS — Football Jerseys in Malete, Kwara State",
  description:
    "Affordable, quality football jerseys for KWASU students and Malete residents. Club & national team shirts with name/number customization. Order online, pay on confirmation — transfer or cash. Pickup or delivery in Malete.",
  keywords: ["football jersey", "Malete", "KWASU", "Kwara State", "jersey store", "Nigeria", "Malète Kits"],
  icons: { icon: "/logo-mk.svg" },
  openGraph: {
    title: "MALÈTE KITS — Football Jerseys in Malete",
    description: "Club & national team jerseys with customization. Order online, pay on confirmation.",
    siteName: "MALÈTE KITS",
    type: "website",
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
