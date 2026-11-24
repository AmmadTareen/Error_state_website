/**
 * Shared data for every post in this folder.
 *
 * A post with `draft: true` gets no permalink and joins no collection, so it is
 * absent from the index, the tag pages, the feed and the sitemap, and no file
 * is written for it at all. `npm run drafts` sets ELEVENTY_DRAFTS to preview
 * them locally; the Netlify build never sets it.
 */

const fs = require("node:fs");
const path = require("node:path");

const SITE = process.env.BASE_URL ?? "https://errorstate.design";

/**
 * A cover can ship a dark twin: the same name with `-dark` before the
 * extension, sitting beside it in content/blog/images/<slug>/. Name one and
 * the page shows it whenever the site is in dark mode. Name none and the
 * single image is used in both, exactly as before.
 */
const darkTwin = (slug, file) => {
  if (!slug || !file) return null;
  const ext = path.extname(file);
  const twin = `${path.basename(file, ext)}-dark${ext}`;
  return fs.existsSync(path.join(__dirname, "images", slug, twin)) ? twin : null;
};

const live = (data) => !data.draft || Boolean(process.env.ELEVENTY_DRAFTS);

module.exports = {
  layout: "post.njk",

  eleventyComputed: {
    permalink: (data) => (live(data) ? `/blog/${data.slug}/index.html` : false),

    eleventyExcludeFromCollections: (data) => !live(data),

    // counted from the Markdown the author wrote, not the rendered HTML
    readMins: (data) => {
      const words = String(data.page.rawInput || "")
        .replace(/^---[\s\S]*?---/, "")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      return Math.max(1, Math.round(words / 200));
    },

    metaTitle: (data) => `${data.title} | Error State`,

    canonical: (data) => `/blog/${data.slug}/`,

    /**
     * Two images, one of them optional.
     *
     * `thumbnail` is the card on the index and the Open Graph image that Slack,
     * LinkedIn and X show on a pasted link. Every post needs one.
     *
     * `showThumbnail: false` keeps the top of the post clear. Left out, or
     * true, the thumbnail opens the post, which is the normal case.
     *
     * `lead` overrides that with a different file when the post should open on
     * something other than its thumbnail.
     *
     * `cover` is still read as a fallback so an un-migrated post keeps working.
     */
    thumb: (data) => data.thumbnail || data.cover || null,

    thumbAlt: (data) => data.thumbnailAlt || data.coverAlt || "",

    thumbDark: (data) => darkTwin(data.slug, data.thumbnail || data.cover),

    leadImage: (data) => {
      // showThumbnail: false is the plain yes/no switch. `lead: false` does
      // the same thing and is kept so older posts keep working.
      if (data.showThumbnail === false || data.lead === false) return null;
      return data.lead || data.thumbnail || data.cover || null;
    },

    leadDark: (data) => {
      if (data.lead === false) return null;
      return darkTwin(data.slug, data.lead || data.thumbnail || data.cover);
    },

    leadAltText: (data) =>
      data.leadAlt || data.thumbnailAlt || data.coverAlt || "",

    ogImage: (data) => {
      const t = data.thumbnail || data.cover;
      return t ? `${SITE}/blog/images/${data.slug}/${t}` : null;
    },

    ogImageAlt: (data) => data.thumbnailAlt || data.coverAlt,

    schema: (data) => {
      if (!live(data)) return null;
      const url = `${SITE}/blog/${data.slug}/`;
      const published = new Date(data.date).toISOString();
      return JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        url,
        headline: data.title,
        description: data.description,
        image: (data.thumbnail || data.cover)
          ? [`${SITE}/blog/images/${data.slug}/${data.thumbnail || data.cover}`]
          : undefined,
        datePublished: published,
        dateModified: published,
        author: { "@type": data.author === "Error State" ? "Organization" : "Person", name: data.author },
        publisher: {
          "@type": "Organization",
          name: "Error State",
          url: SITE,
          logo: {
            "@type": "ImageObject",
            url: `${SITE}/assets/brand/logo-light.svg`,
          },
        },
        keywords: (data.tags || []).join(", "),
      });
    },
  },
};
