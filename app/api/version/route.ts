import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SERVER_INSTANCE_TIME = Date.now();

export async function GET() {
  const buildId =
    process.env.NEXT_PUBLIC_APP_BUILD_ID ||
    process.env.RAILWAY_DEPLOYMENT_ID ||
    String(SERVER_INSTANCE_TIME);

  return NextResponse.json(
    {
      buildId,
      timestamp: Date.now(),
      status: "ok",
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
