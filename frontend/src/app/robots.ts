import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login"],
        disallow: ["/dashboard/", "/admin/"],
      },
    ],
    sitemap: "https://ai-finance-app-ashen.vercel.app/sitemap.xml",
  };
}
