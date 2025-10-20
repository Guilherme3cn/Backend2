import { NextRequest, NextResponse } from "next/server";
import {
  TuyaApiError,
  resolveUidPreference,
  sendCommand
} from "@/lib/tuyaClient";

interface CommandRequestBody {
  switch?: "on" | "off";
  value?: unknown;
  code?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  let body: CommandRequestBody;

  try {
    body = (await request.json()) as CommandRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    const uidParam =
      request.nextUrl.searchParams.get("uid") ??
      request.headers.get("x-tuya-uid") ??
      undefined;

    const uid = resolveUidPreference(uidParam ?? undefined);
    const commandValue =
      body.value ??
      (body.switch === "on"
        ? true
        : body.switch === "off"
          ? false
          : undefined);

    if (commandValue === undefined) {
      return NextResponse.json(
        { error: "Provide either switch ('on' | 'off') or value in the payload." },
        { status: 400 }
      );
    }

    await sendCommand(params.deviceId, uid, {
      value: commandValue,
      code: body.code
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TuyaApiError) {
      return NextResponse.json(
        { error: error.message, detail: error.detail },
        { status: 400 }
      );
    }

    console.error("[tuya][command]", error);
    return NextResponse.json(
      { error: "Unexpected error while forwarding command to Tuya" },
      { status: 500 }
    );
  }
}
