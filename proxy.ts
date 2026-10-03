import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const backendUrl = (
  process.env.BACKEND_API_URL ??
  (process.env.NEXT_PUBLIC_API_URL?.startsWith("http") ? process.env.NEXT_PUBLIC_API_URL : null) ??
  "https://be-tbg.onrender.com/api"
).replace(/\/+$/, "");
const apiBaseUrl = backendUrl.endsWith("/api") ? backendUrl : `${backendUrl}/api`;
const profileResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    profile: z.object({ role: z.enum(["super_admin", "admin", "user"]) }),
  }),
});

function isRoute(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedRoute = ["/dashboard", "/admin", "/super-admin", "/profile", "/savings", "/transactions", "/reports", "/audit-logs"]
    .some((prefix) => isRoute(pathname, prefix));
  const sessionCookie = request.cookies.get("simpanku_access")?.value;

  if (!protectedRoute && pathname !== "/login") return NextResponse.next();
  if (!sessionCookie) {
    if (protectedRoute) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.next();
  }

  let profile: z.infer<typeof profileResponseSchema>["data"]["profile"] | null = null;
  try {
    const response = await fetch(`${apiBaseUrl}/auth/me`, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    if (response.ok) {
      const body: unknown = await response.json();
      const parsed = profileResponseSchema.safeParse(body);
      if (parsed.success) profile = parsed.data.data.profile;
    }
  } catch {
    profile = null;
  }

  if (!profile) {
    if (protectedRoute) return NextResponse.redirect(new URL("/login?reason=session", request.url));
    return NextResponse.next();
  }

  if (pathname === "/login") {
    return NextResponse.redirect(new URL(profile.role === "super_admin" ? "/super-admin" : "/dashboard", request.url));
  }

  if (isRoute(pathname, "/super-admin") && profile.role !== "super_admin") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }
  if (isRoute(pathname, "/admin") && !["admin", "super_admin"].includes(profile.role)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }
  if (isRoute(pathname, "/audit-logs") && profile.role === "user") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }
  if (isRoute(pathname, "/audit-logs") && profile.role !== "super_admin") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/admin/:path*", "/super-admin/:path*", "/profile/:path*", "/savings/:path*", "/transactions/:path*", "/reports/:path*", "/audit-logs/:path*"],
};
