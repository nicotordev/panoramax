-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ(6),
    "cover_image_url" TEXT,
    "cover_image_attribution" TEXT,
    "author_name" TEXT,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_post_translations" (
    "id" UUID NOT NULL,
    "blog_post_id" UUID NOT NULL,
    "locale" "TranslationLocale" NOT NULL,
    "title" TEXT,
    "excerpt" TEXT,
    "body" TEXT,
    "auto_translated" BOOLEAN NOT NULL DEFAULT false,
    "source_locale" TEXT,
    "provider" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "blog_post_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_status_published_at_idx" ON "blog_posts"("status", "published_at");

-- CreateIndex
CREATE INDEX "blog_post_translations_locale_idx" ON "blog_post_translations"("locale");

-- CreateIndex
CREATE INDEX "blog_post_translations_blog_post_id_idx" ON "blog_post_translations"("blog_post_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_post_translations_blog_post_id_locale_key" ON "blog_post_translations"("blog_post_id", "locale");

-- AddForeignKey
ALTER TABLE "blog_post_translations" ADD CONSTRAINT "blog_post_translations_blog_post_id_fkey" FOREIGN KEY ("blog_post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
