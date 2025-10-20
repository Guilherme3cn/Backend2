import { NextRequest, NextResponse } from "next/server";
import {
  TuyaApiError,
  getEnergy,
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
    const energy = await getEnergy(params.deviceId, uid);

    const response = NextResponse.json({
      uid,
      deviceId: params.deviceId,
      energy: {
        powerW: energy.powerW,
        voltageV: energy.voltageV,
        currentA: energy.currentA,
        ts: energy.ts
      }
    });

    response.headers.set("x-tuya-energy-source", energy.source);
    if (energy.source === "mock") {
      response.headers.set(
        "x-tuya-energy-note",
        "This device does not expose real-time energy metrics. Values are simulated."
      );
    }

    return response;
  } catch (error) {
    if (error instanceof TuyaApiError) {
      return NextResponse.json(
        { error: error.message, detail: error.detail },
        { status: 400 }
      );
    }

    console.error("[tuya][energy]", error);
    return NextResponse.json(
      { error: "Unexpected error while fetching device energy usage" },
      { status: 500 }
    );
  }
}
