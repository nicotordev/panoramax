import { clerkMiddleware } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export default clerkMiddleware(async (_auth, req) => intlMiddleware(req));

export const config = {
  matcher: [
    // Exclude all static assets: add webm and mp4 video extensions
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|webm|mp4)).*)",
    "/(api|trpc)(.*)",
  ],
};
