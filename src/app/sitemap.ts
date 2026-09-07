import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://drava.click";
  const lastModified = new Date("2026-09-07T20:45:00.000Z");

  return [
    {
      url: `${baseUrl}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/carte-virtuelle-afrique/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.98,
    },
    {
      url: `${baseUrl}/carte-visa-virtuelle-afrique/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.94,
    },
    {
      url: `${baseUrl}/carte-mastercard-virtuelle-afrique/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.94,
    },
    {
      url: `${baseUrl}/pieces-tiktok-afrique/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.94,
    },
    {
      url: `${baseUrl}/carte-virtuelle-cameroun/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.72,
    },
    {
      url: `${baseUrl}/carte-visa-virtuelle-cameroun/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.68,
    },
    {
      url: `${baseUrl}/carte-mastercard-virtuelle-cameroun/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.68,
    },
    {
      url: `${baseUrl}/pieces-tiktok-cameroun/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.68,
    },
  ];
}
