import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/assets/img/party");

/**
 * Longest side cap (px). Set high so typical Pexels masters (e.g. 4000×6000) are not downscaled.
 * Lower this if you need smaller files for mobile-only use.
 */
const maxEdge = 8192;

/** WebP: max lossy quality + photo preset; avoids chroma subsample blur on sharp edges. */
const webpOptions = {
  quality: 100,
  effort: 6,
  preset: "photo",
  smartSubsample: false,
};

for (const file of fs.readdirSync(dir)) {
  const lower = file.toLowerCase();
  if (!lower.endsWith(".jpg") && !lower.endsWith(".jpeg")) {
    continue;
  }
  const input = path.join(dir, file);
  const base = path.basename(file, path.extname(file));
  const output = path.join(dir, `${base}.webp`);

  await sharp(input)
    .resize(maxEdge, maxEdge, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp(webpOptions)
    .toFile(output);

  fs.unlinkSync(input);
  console.log(`${file} -> ${base}.webp`);
}
