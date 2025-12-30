import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const { productId } = await context.params;

  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    return NextResponse.json(
      { message: "NEXT_PUBLIC_API_URL is not configured" },
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
  try {
    upstream = await fetch(`${base}/products/featured-image/${productId}`, {
      method: "POST",
      headers: auth ? { authorization: auth } : undefined,
      body: formData,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        message: "Backend service request failed",
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

