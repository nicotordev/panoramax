import axios, { type AxiosInstance } from "axios";

function readBaseUrl(): string {
  const raw =
    process.env.PANORAMAX_API_URL?.trim() || "http://127.0.0.1:3001";
  return raw.replace(/\/+$/, "");
}

function readApiKey(): string {
  const key = process.env.PANORAMAX_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "PANORAMAX_API_KEY is required (scope events:write). Example: pnpm --dir apps/api api-key:create local-ingest --scope events:write",
    );
  }
  return key;
}

export function createPanoramaxApiClient(): AxiosInstance {
  return axios.create({
    baseURL: `${readBaseUrl()}/api/v1`,
    headers: {
      "x-api-key": readApiKey(),
      "content-type": "application/json",
    },
    timeout: 120_000,
    validateStatus: () => true,
  });
}

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

export async function upsertEventViaApi(
  client: AxiosInstance,
  payload: Record<string, unknown>,
) {
  const res = await client.post<ApiEnvelope<unknown>>(
    "/events/upsert",
    payload,
  );

  if (res.status >= 400 || !res.data?.success) {
    const detail =
      res.data && typeof res.data === "object" && "error" in res.data
        ? String((res.data as ApiEnvelope<unknown>).error)
        : res.statusText;
    throw new Error(
      `API upsert failed (${res.status}) for ${payload.sourceUrl}: ${detail}`,
    );
  }

  return res.data.data;
}
