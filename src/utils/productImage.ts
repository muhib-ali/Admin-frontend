/**
 * Makes relative product image URLs absolute using NEXT_PUBLIC_API_URL
 * so next/image can load them (requires host in images.remotePatterns).
 */
export function normalizeProductImageUrl(
  src: string | undefined | null
): string {
  if (src == null || typeof src !== "string") return "";
  const s = src.trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return s;
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!base) return s;
  return `${base}/${s.replace(/^\//, "")}`;
}
