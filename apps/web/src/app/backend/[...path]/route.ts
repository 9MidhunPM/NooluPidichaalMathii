import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function apiOrigin() {
  return process.env.API_ORIGIN ?? "http://localhost:8000";
}

function proxiedHeaders(headers: Headers) {
  const forwarded = new Headers(headers);
  forwarded.delete("host");
  forwarded.delete("content-length");
  for (const header of HOP_BY_HOP_HEADERS) forwarded.delete(header);
  return forwarded;
}

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const requestUrl = new URL(request.url);
  const target = new URL(`/${path.join("/")}${requestUrl.search}`, apiOrigin());
  const method = request.method.toUpperCase();

  try {
    const upstream = await fetch(target, {
      method,
      headers: proxiedHeaders(request.headers),
      body: method === "GET" || method === "HEAD" ? undefined : request.body,
      // The browser request body is intentionally passed through unchanged.
      // @ts-expect-error Node's fetch requires this when passing a ReadableStream.
      duplex: "half",
    });

    const headers = proxiedHeaders(upstream.headers);
    return new NextResponse(upstream.body, { headers, status: upstream.status });
  } catch {
    return NextResponse.json(
      { code: "api_unavailable", message: "The analysis service is temporarily unavailable." },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
