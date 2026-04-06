import "dotenv/config";

function requireEnv(name: "API_URL" | "API_KEY" | "METHOD"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set in environment variables`);
  }
  return value;
}

async function main(): Promise<void> {
  try {
    const apiUrl = requireEnv("API_URL");
    const apiKey = requireEnv("API_KEY");

    const response = await fetch(apiUrl, {
      method: process.env.METHOD || "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Request failed with status ${response.status}: ${response.statusText}`,
      );
    }

    const data = await response.json();
    console.log("Fetched data:", data);
  } catch (error) {
    console.error("Error in cron job:", error);
    process.exitCode = 1;
  }
}

main();
