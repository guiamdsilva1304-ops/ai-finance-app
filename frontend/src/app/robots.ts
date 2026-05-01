import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/login", "/blog"], disallow: ["/dashboard/", "/admin/"] }],
    sitemap: "https://imoney.ia.br/sitemap.xml",
  };
}
