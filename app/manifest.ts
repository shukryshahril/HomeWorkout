import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Home Workout",
    short_name: "Workout",
    description: "A 30-day home program built from the equipment you own.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f4f2",
    theme_color: "#f3f4f2",
    icons: [{ src: "/icon.png", sizes: "1024x1024", type: "image/png" }],
  };
}
