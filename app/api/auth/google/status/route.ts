import { NextResponse } from "next/server";
import { googleConfigured } from "@/lib/google-login";
export const dynamic = "force-dynamic";
export function GET() { return NextResponse.json({ configured: googleConfigured() }, { headers: { "Cache-Control": "no-store" } }); }
