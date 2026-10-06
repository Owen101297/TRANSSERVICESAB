import { NextResponse } from "next/server";
import { beginGoogleFlow, GOOGLE_FLOW_COOKIE } from "@/lib/google-login";
import { resolvePublicOrigin } from "@/lib/request-origin";
import { consumeRateLimit } from "@/lib/rate-limit";
export async function GET(req: Request) {
  const rate = consumeRateLimit(`google-start:${req.headers.get("x-forwarded-for") || "unknown"}`, 20);
  if (!rate.allowed) return NextResponse.json({ error: "Intenta nuevamente más tarde." }, { status: 429 });
  try {
    const flow = await beginGoogleFlow();
    const response = NextResponse.redirect(flow.url);
    response.cookies.set(GOOGLE_FLOW_COOKIE, flow.cookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/api/auth/google" });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?google=configuracion", resolvePublicOrigin(req)));
  }
}
