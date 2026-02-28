import { NextRequest, NextResponse } from "next/server";

// Allow long-running ZIP upload + backend processing (up to 30 min for very large ZIPs)
export const maxDuration = 1800;

export async function POST(req: NextRequest) {
  const base = process.env.FILE_BACKEND_API_URL;
  if (!base) {
    return NextResponse.json(
      { message: "FILE_BACKEND_API_URL is not configured" },
      { status: 500 }
    );
  }

  const formData = await req.formData();

  const tokenCookie = req.headers
    .get("cookie")
    ?.split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith("access_token="));
  const cookieToken = tokenCookie ? tokenCookie.split("=").slice(1).join("=") : null;

  const incomingAuth = req.headers.get("authorization");
  const auth = incomingAuth || (cookieToken ? `Bearer ${cookieToken}` : null);

  let upstream: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 29 * 60 * 1000); // 29 min so we stay under maxDuration
  try {
    upstream = await fetch(`${base}/v1/zip-gallery/upload`, {
      method: "POST",
      headers: auth ? { authorization: auth } : undefined,
      body: formData,
      signal: controller.signal,
    });
  } catch (e: unknown) {
    clearTimeout(timeoutId);
    return NextResponse.json(
      {
        message: "Files service request failed",
        error: String((e as Error)?.message ?? e),
      },
      { status: 502 }
    );
  }
  clearTimeout(timeoutId);

  const text = await upstream.text();
  try {
    const json = JSON.parse(text);
    return NextResponse.json(json, { status: upstream.status });
  } catch {
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") || "text/plain" },
    });
  }
}
