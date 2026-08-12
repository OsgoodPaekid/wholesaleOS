import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WholesaleOS",
    short_name: "WholesaleOS",
    description: "Manage stock, sales and profit.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5f7",
    theme_color: "#171c26",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
