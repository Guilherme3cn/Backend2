import { NextRequest, NextResponse } from "next/server";
import {
  TuyaApiError,
  getStatus,
  resolveUidPreference
} from "@/lib/tuyaClient";

export async function GET(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  try {
    const uidParam =
      request.nextUrl.searchParams.get("uid") ??
      request.headers.get("x-tuya-uid") ??
      undefined;

    const uid = resolveUidPreference(uidParam ?? undefined);
    const status = await getStatus(params.deviceId, uid);

    return NextResponse.json({ uid, deviceId: params.deviceId, status });
  } catch (error) {
    if (error instanceof TuyaApiError) {
      return NextResponse.json(
        { error: error.message, detail: error.detail },
        { status: 400 }
      );
    }

    console.error("[tuya][status]", error);
    return NextResponse.json(
      { error: "Unexpected error while fetching device status" },
      { status: 500 }
    );
  }
}
