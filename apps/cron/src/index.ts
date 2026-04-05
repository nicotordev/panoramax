import "dotenv/config";

const { API_URL, API_KEY } = process.env;

if (!API_URL || !API_KEY) {
  throw new Error("API_URL and API_KEY must be set in environment variables");
}

async function main(): Promise<void> {
  try {
    const response = await fetch(API_URL, {
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Fetched data:", data);
  } catch (error) {
    console.error("Error in cron job:", error);
    process.exitCode = 1;
  }
}

main();
