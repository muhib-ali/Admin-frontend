import type { ProductRow } from "./product-form";

export function svgCardImage(seed: string) {
  const safe = String(seed ?? "");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='900' height='600'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='#0b0f14'/>
        <stop offset='1' stop-color='#1f2937'/>
      </linearGradient>
      <radialGradient id='r' cx='35%' cy='35%' r='70%'>
        <stop offset='0' stop-color='#ef4444' stop-opacity='0.6'/>
        <stop offset='1' stop-color='#000000' stop-opacity='0'/>
      </radialGradient>
    </defs>
    <rect width='100%' height='100%' fill='url(#g)'/>
    <rect width='100%' height='100%' fill='url(#r)'/>
    <text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' fill='#e5e7eb' font-family='ui-sans-serif,system-ui' font-size='48' font-weight='700'>${safe}</text>
  </svg>`;

  const base64 =
    typeof window === "undefined"
      ? Buffer.from(svg, "utf8").toString("base64")
      : window.btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

export function nextProductId(existing: ProductRow[]) {
  const nums = existing
    .map((p) => Number(String(p.id).replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `PRD-${String(max + 1).padStart(4, "0")}`;
}
