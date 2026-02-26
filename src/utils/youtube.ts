/**
 * Get YouTube embed URL from various YouTube URL formats.
 */
export function getYoutubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const s = url.trim();
  if (!s) return null;

  const watchMatch = s.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;

  const shortMatch = s.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;

  const embedMatch = s.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return `https://www.youtube.com/embed/${embedMatch[1]}`;

  return null;
}

/**
 * Get embed URL for any supported video platform (YouTube, Vimeo, Dailymotion, or any http(s) URL).
 * Returns null for direct video file URLs (use <video> tag for those).
 */
export function getVideoEmbedUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const s = url.trim();
  if (!s) return null;

  const yt = getYoutubeEmbedUrl(s);
  if (yt) return yt;

  const vimeoMatch = s.match(/(?:vimeo\.com\/)(?:video\/)?(?:channels\/[^/]+\/)?(?:[\w-]+\/)?(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  const dmMatch = s.match(/(?:dailymotion\.com\/video\/|dai\.ly\/)([a-zA-Z0-9]+)/);
  if (dmMatch) return `https://www.dailymotion.com/embed/video/${dmMatch[1]}`;

  const fbMatch = s.match(/(?:facebook\.com\/watch\/\?v=|fb\.watch\/|facebook\.com\/[^/]+\/videos\/)(\d+)/);
  if (fbMatch) return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(s)}`;

  // Purani implementation: baaki sab (direct files, backend video URLs) ke liye null → <video> tag
  return null;
}
