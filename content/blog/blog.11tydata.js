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

    ogImage: (data) =>
      data.cover ? `${SITE}/blog/images/${data.slug}/${data.cover}` : null,

    ogImageAlt: (data) => data.coverAlt,

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
        image: data.cover
          ? [`${SITE}/blog/images/${data.slug}/${data.cover}`]
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
