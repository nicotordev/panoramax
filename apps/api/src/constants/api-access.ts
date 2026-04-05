export const apiKeyScopes = [
  "events:write",
  "sources:ingest",
  "api_keys:manage",
] as const;

export type ApiKeyScope = (typeof apiKeyScopes)[number];

export const apiAccess = {
  eventsWrite: ["events:write"],
  sourcesIngest: ["sources:ingest"],
  apiKeysManage: ["api_keys:manage"],
} as const satisfies Record<string, readonly ApiKeyScope[]>;
