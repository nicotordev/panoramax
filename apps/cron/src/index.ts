import "dotenv/config";

type CronApiResponse = {
  success?: boolean;
  message?: string;
  status?: number;
  data?: {
    started?: boolean;
  };
};

function requireEnv(
  name: "API_URL" | "API_KEY" | "METHOD" | "BODY"
): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set in environment variables`);
  }
  return value;
}

async function fetchApiData(): Promise<unknown> {
  const apiUrl = requireEnv("API_URL");
  const apiKey = requireEnv("API_KEY");
  const method = process.env.METHOD || "GET";

  let body: string | undefined = undefined;
  if (process.env.BODY) {
    body = process.env.BODY;
    console.log(`[${new Date().toISOString()}] Using request body from env: ${body}`);
  }

  console.log(`[${new Date().toISOString()}] Making request to: ${apiUrl}`);
  console.log(`[${new Date().toISOString()}] Using HTTP method: ${method}`);

  const response = await fetch(apiUrl, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    ...(body && { body }),
  });

  console.log(
    `[${new Date().toISOString()}] Received response: ${response.status} ${response.statusText}`
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error(
      `[${new Date().toISOString()}] API Error Response: ${errText}`
    );
    throw new Error(
      `Request failed with status ${response.status}: ${response.statusText}`
    );
  }

  return response.json();
}

function isAcceptedButNotStarted(data: unknown): data is CronApiResponse {
  if (!data || typeof data !== "object") {
    return false;
  }

  const response = data as CronApiResponse;
  return (
    response.success === true &&
    response.status === 202 &&
    response.data?.started === false
  );
}

async function main(): Promise<number> {
  try {
    console.log(`[${new Date().toISOString()}] Starting cron job...`);
    const data = await fetchApiData();
    console.log(`[${new Date().toISOString()}] Fetched data:`, data);

    if (isAcceptedButNotStarted(data)) {
      console.error(
        `[${new Date().toISOString()}] Cron request was accepted but no ingestion started: ${data.message ?? "active task already running"}`
      );
      return 1;
    }

    console.log(`[${new Date().toISOString()}] Cron job completed successfully.`);
    return 0;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in cron job:`, error);
    return 1;
  }
}

main().then((exitCode) => {
  console.log(`[${new Date().toISOString()}] Exiting process with code: ${exitCode}`);
  process.exit(exitCode);
});
