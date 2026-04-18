import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";

chromium.use(stealth());

export type PlaywrightFetchSession = {
  fetchHtml: (url: string) => Promise<string>;
  close: () => Promise<void>;
};

/**
 * Single-browser session: one page at a time, polite for one IP (no proxy pool).
 */
export async function createPlaywrightFetchSession(): Promise<PlaywrightFetchSession> {
  const userAgent =
    process.env.SCRAPER_USER_AGENT?.trim() ||
    "PanoramaxLocalIngest/1.0 (+https://github.com/nicotordev/panoramax)";

  const browser = await chromium.launch({
    headless: process.env.SCRAPER_HEADED === "1" ? false : true,
  });

  const context = await browser.newContext({
    userAgent,
    viewport: { width: 1280, height: 720 },
    locale: "es-CL",
  });

  const delayMs = Number(process.env.SCRAPER_REQUEST_DELAY_MS ?? "2500");
  let lastFetch = 0;

  const fetchHtml = async (url: string) => {
    const wait = Math.max(0, delayMs - (Date.now() - lastFetch));
    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait));
    }
    const page = await context.newPage();
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: Number(process.env.SCRAPER_NAV_TIMEOUT_MS ?? "90000"),
      });
      const html = await page.content();
      lastFetch = Date.now();
      return html;
    } finally {
      await page.close();
    }
  };

  return {
    fetchHtml,
    close: async () => {
      await context.close();
      await browser.close();
    },
  };
}
