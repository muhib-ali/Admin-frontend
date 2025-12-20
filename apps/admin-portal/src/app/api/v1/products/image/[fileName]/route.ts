import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ fileName: string }> }
) {
  const { fileName } = await context.params;

  const base = process.env.FILE_BACKEND_API_URL;
  if (!base) {
    return NextResponse.json(
      { message: "FILE_BACKEND_API_URL is not configured" },
      { status: 500 }
    );
  }

  const tokenCookie = req.headers
    .get("cookie")
    ?.split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith("access_token="));
  const cookieToken = tokenCookie ? tokenCookie.split("=").slice(1).join("=") : null;

  const incomingAuth = req.headers.get("authorization");
  const auth = incomingAuth || (cookieToken ? `Bearer ${cookieToken}` : null);

  let upstream: Response;
  try {
    upstream = await fetch(
      `${base}/v1/products/image/${encodeURIComponent(fileName)}`,
      {
        method: "DELETE",
        headers: auth ? { authorization: auth } : undefined,
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        message: "Files service request failed",
        error: String(e?.message ?? e),
      },
      { status: 502 }
    );
  }

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
