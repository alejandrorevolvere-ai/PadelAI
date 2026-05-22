import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/layout/Providers";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ui/error-boundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://padelaicoach.com";

export const metadata: Metadata = {
  title: "PadelAI Coach",
  description:
    "Tu entrenador personal de pádel con inteligencia artificial. Mejora tu juego con análisis de video, entrenamiento en VR y coaching personalizado.",
  keywords: ["pádel", "entrenador IA", "análisis video", "coaching pádel"],
  metadataBase: new URL(baseUrl),

  // Open Graph
  openGraph: {
    title: "PadelAI Coach — Tu entrenador personal de pádel con IA",
    description:
      "Mejora tu juego con análisis de video impulsado por inteligencia artificial, entrenamiento en realidad virtual y un coach virtual disponible 24/7.",
    type: "website",
    locale: "es_ES",
    siteName: "PadelAI Coach",
    url: baseUrl,
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "PadelAI Coach — Tu entrenador personal de pádel con IA",
    description:
      "Mejora tu juego con análisis de video impulsado por inteligencia artificial, entrenamiento en realidad virtual y un coach virtual disponible 24/7.",
  },

  // Theme color
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "PadelAI Coach",
  applicationCategory: "SportsApplication",
  operatingSystem: "Web",
  description:
    "Tu entrenador personal de pádel con inteligencia artificial. Mejora tu juego con análisis de video, entrenamiento en VR y coaching personalizado.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
  author: {
    "@type": "Organization",
    name: "PadelAI",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <ErrorBoundary>
          <Providers>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster
              richColors
              position="top-right"
              closeButton
              duration={4000}
            />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
