import type { ApiKeyScope } from "../constants/api-access.js";
import { prisma } from "../lib/prisma.js";
import {
  generateApiKey,
  hasRequiredScopes,
  parseApiKeyScopes,
  hashApiKey,
} from "../lib/auth/api-keys.js";

type CreateApiKeyInput = {
  name: string;
  scopes?: string[];
  expiresAt?: Date;
};

export type AuthenticatedApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
};

class ApiKeysService {
  public async create(input: CreateApiKeyInput) {
    const name = input.name.trim();
    if (name.length === 0) {
      throw new Error("API key name is required");
    }

    const scopes = parseApiKeyScopes(input.scopes ?? []);
    const { rawKey, keyHash, keyPrefix } = generateApiKey();

    const record = await prisma.apiKey.create({
      data: {
        name,
        keyHash,
        keyPrefix,
        scopes,
        expiresAt: input.expiresAt,
      },
    });

    return {
      id: record.id,
      name: record.name,
      keyPrefix: record.keyPrefix,
      scopes: record.scopes,
      expiresAt: record.expiresAt,
      rawKey,
    };
  }

  public async validate(rawApiKey: string): Promise<AuthenticatedApiKey | null> {
    const candidate = rawApiKey.trim();
    if (candidate.length === 0) {
      return null;
    }

    const record = await prisma.apiKey.findUnique({
      where: { keyHash: hashApiKey(candidate) },
    });

    if (!record || !record.isActive || record.revokedAt !== null) {
      return null;
    }

    if (record.expiresAt !== null && record.expiresAt <= new Date()) {
      return null;
    }

    await prisma.apiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      id: record.id,
      name: record.name,
      keyPrefix: record.keyPrefix,
      scopes: record.scopes,
    };
  }

  public hasScopes(
    apiKey: Pick<AuthenticatedApiKey, "scopes">,
    requiredScopes: ApiKeyScope[],
  ): boolean {
    return hasRequiredScopes(apiKey.scopes, requiredScopes);
  }
}

const apiKeysService = new ApiKeysService();

export default apiKeysService;
