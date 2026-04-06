import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type R2Config = {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  bucket: string;
  publicBaseUrl: string;
};

let cachedClient: S3Client | null = null;
let cachedConfig: R2Config | null = null;

function getEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getRequiredEnv(...names: string[]): string {
  for (const name of names) {
    const value = getEnv(name);
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing required environment variable: ${names.join(" or ")}`);
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function encodeObjectKey(key: string): string {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function resolveR2Config(): R2Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = {
    accessKeyId: getRequiredEnv("R2_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID"),
    secretAccessKey: getRequiredEnv(
      "R2_SECRET_ACCESS_KEY",
      "AWS_SECRET_ACCESS_KEY",
    ),
    endpoint: trimTrailingSlash(
      getRequiredEnv("R2_ENDPOINT", "AWS_ENDPOINT_URL_S3", "AWS_ENDPOINT_URL"),
    ),
    bucket: getRequiredEnv("R2_BUCKET", "R2_BUCKET_NAME", "AWS_BUCKET"),
    publicBaseUrl: trimTrailingSlash(
      getRequiredEnv("R2_PUBLIC_BASE_URL", "R2_PUBLIC_URL"),
    ),
  };

  return cachedConfig;
}

function getR2Client(): S3Client {
  if (cachedClient) {
    return cachedClient;
  }

  const config = resolveR2Config();

  cachedClient = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cachedClient;
}

export function getR2PublicBaseUrl(): string {
  return resolveR2Config().publicBaseUrl;
}

export function isR2PublicUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }

  return url.startsWith(getR2PublicBaseUrl());
}

export async function uploadBufferToR2({
  key,
  body,
  contentType,
  cacheControl = "public, max-age=31536000, immutable",
}: {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}): Promise<string> {
  const config = resolveR2Config();
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  );

  return `${config.publicBaseUrl}/${encodeObjectKey(key)}`;
}
