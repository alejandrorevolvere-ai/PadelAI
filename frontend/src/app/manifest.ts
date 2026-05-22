import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PadelAI Coach",
    short_name: "PadelAI",
    description:
      "Tu entrenador personal de pádel con IA. Mejora tu juego con análisis de video, entrenamiento en VR y coaching personalizado.",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#1e40af",
    icons: [
      {
        src: "/icons/icon-192x192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
