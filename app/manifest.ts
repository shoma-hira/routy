import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ROUTY",
    short_name: "ROUTY",
    description: "人の休日の動き方をフォローして、真似できるSNS",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#F8F6EF",
    theme_color: "#69B7E8",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
