import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/assets/img/categories");

/** Longest side for category tiles (swiper ~128px wide; ~3× for retina). */
const maxEdge = 960;

const webpOptions = {
  quality: 82,
  effort: 6,
  preset: "photo",
  smartSubsample: true,
};

/** Source JPEGs in `categories/` → stable `{key}.webp` names aligned with CategoryPrimaryEnum. */
const CATEGORY_SOURCES = {
  music: "pexels-yankrukov-9010051-music.jpg",
  theatre: "pexels-ann-h-45017-12616961-theatre.jpg",
  standup: "pexels-damianscarlassa-17850551-stand-up.jpg",
  dance: "pexels-sebastiaan9977-3379255-dance.jpg",
  festival: "pexels-sinalmultimedia-28886690-festival.jpg",
  fair: "pexels-rccbtn-28753293-fair.jpg",
  exhibition: "pexels-bingqian-li-230971044-34748945-exhibition.jpg",
  food_drink: "pexels-holoshuriken-15750739-food-and-drink.jpg",
  family: "pexels-julianemonarifotografia-19351580-family.jpg",
  sports: "pexels-avillalonv-32303952-sports.jpg",
  workshop: "pexels-thirdman-7181107-workshop.jpg",
  special_experience: "pexels-mohamed9380-36572262-special-experiences.jpg",
};

for (const [key, filename] of Object.entries(CATEGORY_SOURCES)) {
  const input = path.join(dir, filename);
  if (!fs.existsSync(input)) {
    console.warn(`skip (missing): ${filename}`);
    continue;
  }
  const output = path.join(dir, `${key}.webp`);

  await sharp(input)
    .resize(maxEdge, maxEdge, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp(webpOptions)
    .toFile(output);

  fs.unlinkSync(input);
  console.log(`${filename} -> ${key}.webp`);
}
