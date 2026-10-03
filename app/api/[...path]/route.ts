import { type NextRequest, NextResponse } from "next/server";

const BACKEND_BASE = (
  process.env.BACKEND_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "https://be-tbg.onrender.com/api"
).replace(/\/+$/, "");

async function handleProxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetUrl = `${BACKEND_BASE}/${path.join("/")}${request.nextUrl.search}`;

  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.delete("host");
  forwardHeaders.delete("accept-encoding");
  const clientOrigin = request.headers.get("origin") || request.nextUrl.origin || "http://localhost:3000";
  forwardHeaders.set("origin", clientOrigin);

  let body: ArrayBuffer | undefined = undefined;
  if (!["GET", "HEAD"].includes(request.method.toUpperCase())) {
    body = await request.arrayBuffer();
  }

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: forwardHeaders,
    body,
    redirect: "manual",
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower !== "set-cookie" && lower !== "content-encoding" && lower !== "content-length") {
      responseHeaders.set(key, value);
    }
  });

  const responseText = await response.text();
  const nextResponse = new NextResponse(responseText, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });

  const cookies = response.headers.getSetCookie?.() ?? [];
  const isHttpLocal = request.nextUrl.protocol === "http:";

  for (const cookieStr of cookies) {
    let cleanCookie = cookieStr;
    if (isHttpLocal) {
      cleanCookie = cleanCookie
        .replace(/;\s*Secure/gi, "")
        .replace(/;\s*SameSite=None/gi, "; SameSite=Lax");
    }
    nextResponse.headers.append("set-cookie", cleanCookie);
  }

  return nextResponse;
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
