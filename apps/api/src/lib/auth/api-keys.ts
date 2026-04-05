import { createHash, randomBytes } from "node:crypto";
import { apiKeyScopes, type ApiKeyScope } from "../../constants/api-access.js";

const API_KEY_TOKEN_PREFIX = "pmx";

export function hashApiKey(rawApiKey: string): string {
  return createHash("sha256").update(rawApiKey).digest("hex");
}

export function generateApiKey() {
  const identifier = randomBytes(6).toString("hex");
  const secret = randomBytes(24).toString("base64url");
  const keyPrefix = `${API_KEY_TOKEN_PREFIX}_${identifier}`;
  const rawKey = `${keyPrefix}_${secret}`;

  return {
    rawKey,
    keyPrefix,
    keyHash: hashApiKey(rawKey),
  };
}

export function parseApiKeyScopes(values: string[]): ApiKeyScope[] {
  const invalidScopes = values.filter(
    (value): value is string => !apiKeyScopes.includes(value as ApiKeyScope),
  );

  if (invalidScopes.length > 0) {
    throw new Error(
      `Invalid API key scope(s): ${invalidScopes.join(", ")}. Allowed scopes: ${apiKeyScopes.join(", ")}`,
    );
  }

  return Array.from(new Set(values)) as ApiKeyScope[];
}

export function hasRequiredScopes(
  grantedScopes: string[],
  requiredScopes: string[],
): boolean {
  if (requiredScopes.length === 0) {
    return true;
  }

  const granted = new Set(grantedScopes);
  return requiredScopes.every((scope) => granted.has(scope));
}
