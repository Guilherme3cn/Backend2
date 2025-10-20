import { NextRequest, NextResponse } from "next/server";
import { buildAuthUrl, getTuyaConfig } from "@/lib/tuyaClient";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  getTuyaConfig(); // validates env upfront

  const state = request.nextUrl.searchParams.get("state") ?? undefined;
  const loginUrl = buildAuthUrl(state);

  return NextResponse.redirect(loginUrl, {
    status: 302
  });
}
