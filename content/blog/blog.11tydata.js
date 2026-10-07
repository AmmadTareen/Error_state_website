/**
 * Shared data for every post in this folder.
 *
 * A post with `draft: true` gets no permalink and joins no collection, so it is
 * absent from the index, the tag pages, the feed and the sitemap, and no file
 * is written for it at all. `npm run drafts` sets ELEVENTY_DRAFTS to preview
 * them locally; the Netlify build never sets it.
 */

const SITE = process.env.BASE_URL ?? "https://errorstate.design";

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
     * `lead` is the image at the top of the post. Leave it out and the
     * thumbnail is used, which is the normal case. Name a different file when
     * the post wants a different opening image, or set `lead: false` to start
     * straight on the writing.
     *
     * `cover` is still read as a fallback so an un-migrated post keeps working.
     */
    thumb: (data) => data.thumbnail || data.cover || null,

    thumbAlt: (data) => data.thumbnailAlt || data.coverAlt || "",

    leadImage: (data) => {
      if (data.lead === false) return null;
      return data.lead || data.thumbnail || data.cover || null;
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
