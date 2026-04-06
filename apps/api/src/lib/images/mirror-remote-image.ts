import { createHash } from "node:crypto";
import axios from "axios";
import { isR2PublicUrl, uploadBufferToR2 } from "../storage/r2.js";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

const CONTENT_TYPE_TO_EXTENSION: Record<string, string> = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

function sanitizeFilenamePart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalizeContentType(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.split(";")[0]?.trim().toLowerCase() ?? null;
}

function inferExtensionFromUrl(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
    if (!match) {
      return null;
    }

    return match[1]!.toLowerCase();
  } catch {
    return null;
  }
}

function buildRequestHeaders(referer?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  };

  if (referer) {
    headers.Referer = referer;
  }

  return headers;
}

function buildRefererCandidates(sourceUrl?: string): string[] {
  if (!sourceUrl) {
    return [];
  }

  const candidates = new Set<string>([sourceUrl]);

  try {
    const parsed = new URL(sourceUrl);
    candidates.add(parsed.origin);
  } catch {
    // Ignore invalid source URLs.
  }

  return [...candidates];
}

async function downloadImageBuffer(
  imageUrl: string,
  sourceUrl?: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const referers = [undefined, ...buildRefererCandidates(sourceUrl)];
  let lastError: unknown = null;

  for (const referer of referers) {
    try {
      const response = await axios.get<ArrayBuffer>(imageUrl, {
        timeout: 20000,
        responseType: "arraybuffer",
        maxContentLength: MAX_IMAGE_BYTES,
        maxBodyLength: MAX_IMAGE_BYTES,
        headers: buildRequestHeaders(referer),
        validateStatus: (status) => status >= 200 && status < 400,
      });

      const contentType = normalizeContentType(response.headers["content-type"]);
      if (!contentType?.startsWith("image/")) {
        throw new Error(
          `Remote file is not an image. Received content-type: ${contentType ?? "unknown"}`,
        );
      }

      return {
        buffer: Buffer.from(response.data),
        contentType,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to download image: ${imageUrl}`);
}

export async function mirrorRemoteImageToR2({
  imageUrl,
  eventId,
  source,
  sourceUrl,
}: {
  imageUrl: string;
  eventId: string;
  source: string;
  sourceUrl?: string;
}): Promise<string> {
  if (isR2PublicUrl(imageUrl)) {
    return imageUrl;
  }

  const { buffer, contentType } = await downloadImageBuffer(imageUrl, sourceUrl);
  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  const extension =
    CONTENT_TYPE_TO_EXTENSION[contentType] ?? inferExtensionFromUrl(imageUrl) ?? "bin";
  const key = [
    "events",
    sanitizeFilenamePart(source) || "source",
    eventId,
    `${hash}.${extension}`,
  ].join("/");

  return uploadBufferToR2({
    key,
    body: buffer,
    contentType,
  });
}
