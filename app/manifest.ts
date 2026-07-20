import type { MetadataRoute } from "next";

const appDescription =
  "\u4EBA\u306E\u4F11\u65E5\u306E\u52D5\u304D\u65B9\u3092\u30D5\u30A9\u30ED\u30FC\u3057\u3066\u3001\u771F\u4F3C\u3067\u304D\u308BSNS";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ROUTY",
    short_name: "ROUTY",
    description: appDescription,
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#28B83F",
    theme_color: "#28B83F",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
