import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, getTuyaConfig } from "@/lib/tuyaClient";

const DEEP_LINK_URL = process.env.TUYA_APP_DEEP_LINK;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  getTuyaConfig(); // ensure env is present

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state") ?? undefined;

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code" },
      { status: 400 }
    );
  }

  try {
    const credential = await exchangeCodeForToken(code);
    const config = getTuyaConfig();

    if (DEEP_LINK_URL) {
      const deepLink = new URL(DEEP_LINK_URL);
      deepLink.searchParams.set("uid", credential.uid);
      if (state) {
        deepLink.searchParams.set("state", state);
      }
      return NextResponse.redirect(deepLink.toString());
    }

    const appBase = config.backendUrl ?? request.nextUrl.origin;
    const successUrl = new URL("/connected", appBase);
    successUrl.searchParams.set("uid", credential.uid);
    if (state) {
      successUrl.searchParams.set("state", state);
    }

    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    console.error("[tuya][callback]", error);
    return NextResponse.json(
      { error: "Unable to exchange Tuya authorization code" },
      { status: 500 }
    );
  }
}
