import "dotenv/config";
import { apiKeyScopes } from "../constants/api-access.js";
import apiKeysService from "../services/api-keys.service.js";
import { prisma } from "../lib/prisma.js";

type ParsedArgs = {
  name: string;
  scopes: string[];
  expiresAt?: Date;
};

function readFlagValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function parseArgs(argv: string[]): ParsedArgs {
  let name: string | undefined;
  const scopes: string[] = [];
  let expiresAt: Date | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--scope") {
      scopes.push(readFlagValue(argv, index, "--scope"));
      index += 1;
      continue;
    }

    if (arg.startsWith("--scope=")) {
      scopes.push(arg.slice("--scope=".length));
      continue;
    }

    if (arg === "--expires-in-days") {
      const rawDays = readFlagValue(argv, index, "--expires-in-days");
      const days = Number(rawDays);
      if (!Number.isFinite(days) || days <= 0) {
        throw new Error("--expires-in-days must be a positive number");
      }
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      index += 1;
      continue;
    }

    if (arg.startsWith("--expires-in-days=")) {
      const rawDays = arg.slice("--expires-in-days=".length);
      const days = Number(rawDays);
      if (!Number.isFinite(days) || days <= 0) {
        throw new Error("--expires-in-days must be a positive number");
      }
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown flag: ${arg}`);
    }

    if (name === undefined) {
      name = arg;
      continue;
    }

    throw new Error(`Unexpected argument: ${arg}`);
  }

  if (name === undefined || name.trim() === "") {
    throw new Error(
      "Usage: pnpm --dir apps/api api-key:create <name> [--scope events:write] [--scope sources:ingest] [--expires-in-days 30]",
    );
  }

  return {
    name,
    scopes,
    expiresAt,
  };
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const created = await apiKeysService.create(parsed);

  console.log("API key created.");
  console.log(`Name: ${created.name}`);
  console.log(`ID: ${created.id}`);
  console.log(`Prefix: ${created.keyPrefix}`);
  console.log(`Scopes: ${created.scopes.length > 0 ? created.scopes.join(", ") : "(none)"}`);
  console.log(
    `Expires at: ${created.expiresAt?.toISOString() ?? "never"}`,
  );
  console.log("");
  console.log("Store this key now. It will not be shown again.");
  console.log(created.rawKey);
  console.log("");
  console.log(
    `Allowed scopes: ${apiKeyScopes.join(", ")}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
