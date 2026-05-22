import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://padelaicoach.com";

const routes = [
  { path: "", priority: 1.0, changeFrequency: "monthly" as const },
  { path: "/chat", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/video", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/vr", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/dashboard", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/pricing", priority: 0.6, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
