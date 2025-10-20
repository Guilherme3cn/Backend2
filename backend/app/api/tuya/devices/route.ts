import { NextRequest, NextResponse } from "next/server";
import {
  TuyaApiError,
  getDevices,
  resolveUidPreference
} from "@/lib/tuyaClient";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const uidParam =
      request.nextUrl.searchParams.get("uid") ??
      request.headers.get("x-tuya-uid") ??
      undefined;

    const uid = resolveUidPreference(uidParam ?? undefined);
    const devices = await getDevices(uid);

    return NextResponse.json({ uid, devices });
  } catch (error) {
    if (error instanceof TuyaApiError) {
      return NextResponse.json(
        { error: error.message, detail: error.detail },
        { status: 400 }
      );
    }

    console.error("[tuya][devices]", error);
    return NextResponse.json(
      { error: "Unexpected error while fetching Tuya devices" },
      { status: 500 }
    );
  }
}
