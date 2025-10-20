import crypto from "crypto";
import { tokenStore, type StoredCredential } from "./tokenStore";

const TOKEN_EXPIRY_BUFFER_MS = 60_000;

export class TuyaApiError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly detail?: unknown
  ) {
    super(message);
    this.name = "TuyaApiError";
  }
}

interface TuyaConfig {
  clientId: string;
  clientSecret: string;
  authKey?: string;
  projectCode?: string;
  baseUrl: string;
  callbackUrl: string;
  backendUrl?: string;
}

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

interface TuyaRequestOptions<TBody = unknown> {
  path: string;
  method?: HttpMethod;
  query?: Record<string, string | number | undefined>;
  body?: TBody;
  accessToken?: string;
}

interface TuyaResponse<T> {
  success: boolean;
  result: T;
  t: number;
  tid: string;
  code?: number;
  msg?: string;
}

interface ExchangeCodeResponse {
  access_token: string;
  refresh_token: string;
  expire_time: number;
  uid: string;
}

interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expire_time: number;
}

interface TuyaDevice {
  id: string;
  name: string;
  category: string;
  online: boolean;
  icon?: string;
}

interface TuyaStatusDatum {
  code: string;
  value: unknown;
}

interface EnergySnapshot {
  powerW: number;
  voltageV: number;
  currentA: number;
  ts: number;
  source: "tuya" | "mock";
}

let cachedConfig: TuyaConfig | null = null;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value?.trim() || undefined;
}

export function getTuyaConfig(): TuyaConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const clientId = readEnv("TUYA_CLIENT_ID");
  const clientSecret = readEnv("TUYA_CLIENT_SECRET");
  const baseUrl = readEnv("TUYA_REGION_BASE_URL");
  const callbackUrl = readEnv("TUYA_CALLBACK_URL");
  const backendUrl = readEnv("BACKEND_URL");

  if (!clientId || !clientSecret || !baseUrl || !callbackUrl) {
    throw new Error(
      "Missing Tuya configuration. Please ensure TUYA_CLIENT_ID, TUYA_CLIENT_SECRET, TUYA_REGION_BASE_URL, and TUYA_CALLBACK_URL are set."
    );
  }

  cachedConfig = {
    clientId,
    clientSecret,
    baseUrl,
    callbackUrl,
    authKey: readEnv("TUYA_AUTH_KEY"),
    projectCode: readEnv("TUYA_PROJECT_CODE"),
    backendUrl
  };

  return cachedConfig;
}

function nonce() {
  return crypto.randomUUID().replace(/-/g, "");
}

function sha256Hex(payload: string) {
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function buildQueryString(query: Record<string, string | number | undefined> = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs.length > 0 ? `?${qs}` : "";
}

async function tuyaRequest<TResult, TBody = unknown>(
  options: TuyaRequestOptions<TBody>
): Promise<TResult> {
  const config = getTuyaConfig();
  const method = (options.method ?? "GET").toUpperCase() as HttpMethod;
  const queryString = buildQueryString(options.query);
  const url = `${config.baseUrl}${options.path}${queryString}`;
  const timestamp = Date.now().toString();
  const currentNonce = nonce();
  const bodyString =
    options.body !== undefined ? JSON.stringify(options.body) : "";
  const contentHash = sha256Hex(bodyString);
  const stringToSign = [method, contentHash, "", `${options.path}${queryString}`].join("\n");
  const signStr = `${config.clientId}${options.accessToken ?? ""}${timestamp}${currentNonce}${stringToSign}`;
  const sign = crypto
    .createHmac("sha256", config.clientSecret)
    .update(signStr)
    .digest("hex")
    .toUpperCase();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "client_id": config.clientId,
    sign,
    sign_method: "HMAC-SHA256",
    t: timestamp,
    nonce: currentNonce,
    lang: "en"
  };

  if (options.accessToken) {
    headers["access_token"] = options.accessToken;
  }

  if (config.authKey) {
    headers["Security-AuthKey"] = config.authKey;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: bodyString || undefined
  });

  if (!response.ok) {
    const text = await response.text();
    throw new TuyaApiError(`Tuya API request failed with status ${response.status}`, response.status, text);
  }

  const payload = (await response.json()) as TuyaResponse<TResult>;

  if (!payload.success) {
    throw new TuyaApiError(
      payload.msg || "Tuya API error",
      payload.code,
      payload
    );
  }

  return payload.result;
}

function persistCredential(raw: {
  uid: string;
  access_token: string;
  refresh_token: string;
  expire_time: number;
}): StoredCredential {
  const expiresInMs = raw.expire_time * 1000;
  const credential: StoredCredential = {
    uid: raw.uid,
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token,
    expiresAt: Date.now() + expiresInMs,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  tokenStore.set(credential);
  return credential;
}

export async function exchangeCodeForToken(code: string) {
  const config = getTuyaConfig();

  const result = await tuyaRequest<ExchangeCodeResponse>({
    path: "/v1.0/token",
    method: "POST",
    query: {
      grant_type: 1
    },
    body: {
      code,
      redirect_uri: config.callbackUrl
    }
  });

  return persistCredential(result);
}

async function refreshAccessToken(uid: string) {
  const existing = tokenStore.get(uid);
  if (!existing) {
    throw new TuyaApiError(`No stored credentials for uid ${uid}`);
  }

  const result = await tuyaRequest<RefreshTokenResponse>({
    path: `/v1.0/token/${existing.refreshToken}`,
    method: "GET",
    query: {
      grant_type: 2
    }
  });

  const updated = tokenStore.update(uid, {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    expiresAt: Date.now() + result.expire_time * 1000
  });

  return updated.accessToken;
}

export async function getAccessToken(uid: string) {
  const existing = tokenStore.get(uid);
  if (!existing) {
    throw new TuyaApiError(`No stored credentials for uid ${uid}`);
  }

  if (existing.expiresAt - TOKEN_EXPIRY_BUFFER_MS <= Date.now()) {
    return refreshAccessToken(uid);
  }

  return existing.accessToken;
}

export function resolveUidPreference(requestedUid?: string) {
  if (requestedUid) {
    return requestedUid;
  }

  const entries = tokenStore.list();
  if (entries.length === 1) {
    return entries[0].uid;
  }

  if (entries.length === 0) {
    throw new TuyaApiError("No linked Tuya accounts found. Complete the OAuth flow first.");
  }

  throw new TuyaApiError("Multiple Tuya accounts linked. Specify the uid query parameter.");
}

export async function getDevices(uid: string) {
  const accessToken = await getAccessToken(uid);
  const result = await tuyaRequest<TuyaDevice[]>({
    path: `/v1.0/users/${uid}/devices`,
    method: "GET",
    accessToken
  });

  return result.map((device) => ({
    id: device.id,
    name: device.name,
    category: device.category,
    online: device.online,
    icon: device.icon
  }));
}

export async function getStatus(deviceId: string, uid: string) {
  const accessToken = await getAccessToken(uid);
  const result = await tuyaRequest<TuyaStatusDatum[]>({
    path: `/v1.0/devices/${deviceId}/status`,
    method: "GET",
    accessToken
  });

  const switchDatum =
    result.find((item) => item.code === "switch_1") ??
    result.find((item) => item.code === "switch") ??
    result.find((item) => item.code === "switch_led");

  return {
    on: Boolean(switchDatum?.value ?? false),
    raw: result
  };
}

function toNumber(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function mockEnergySnapshot(): EnergySnapshot {
  const timestamp = Date.now();
  const power = Number((Math.random() * 120 + 5).toFixed(2));
  const voltage = Number((110 + Math.random() * 5).toFixed(2));
  const current = Number((power / voltage).toFixed(2));
  return {
    powerW: power,
    voltageV: voltage,
    currentA: current,
    ts: timestamp,
    source: "mock"
  };
}

export async function getEnergy(deviceId: string, uid: string): Promise<EnergySnapshot> {
  const accessToken = await getAccessToken(uid);
  const result = await tuyaRequest<TuyaStatusDatum[]>({
    path: `/v1.0/devices/${deviceId}/status`,
    method: "GET",
    accessToken
  });

  const power = result.find((item) => item.code === "cur_current" || item.code === "cur_power");
  const voltage = result.find((item) => item.code === "cur_voltage");

  if (!power && !voltage) {
    return mockEnergySnapshot();
  }

  const powerW = toNumber(power?.value, 0);
  const voltageV = toNumber(voltage?.value, 120);
  const currentA = voltageV !== 0 ? Number((powerW / voltageV).toFixed(2)) : 0;

  return {
    powerW,
    voltageV,
    currentA,
    ts: Date.now(),
    source: "tuya"
  };
}

export async function sendCommand(
  deviceId: string,
  uid: string,
  payload: { code?: string; value: unknown; }
) {
  const accessToken = await getAccessToken(uid);
  const code = payload.code ?? "switch";

  const body = {
    commands: [
      {
        code,
        value: payload.value
      }
    ]
  };

  return tuyaRequest<Record<string, unknown>>({
    path: `/v1.0/devices/${deviceId}/commands`,
    method: "POST",
    accessToken,
    body
  });
}

export function buildAuthUrl(state?: string) {
  const config = getTuyaConfig();
  const authorizationUrl = new URL("/v1.0/login/auth", config.baseUrl);
  authorizationUrl.searchParams.set("client_id", config.clientId);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("redirect_uri", config.callbackUrl);
  authorizationUrl.searchParams.set("lang", "en");
  authorizationUrl.searchParams.set("scope", "all");

  if (state) {
    authorizationUrl.searchParams.set("state", state);
  }

  return authorizationUrl.toString();
}

export function getTokenStoreSnapshot() {
  return tokenStore.list();
}
