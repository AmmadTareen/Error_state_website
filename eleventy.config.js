/**
 * Error State build.
 *
 * The site stays hand written HTML. Eleventy's only job is to copy those pages
 * through untouched and to generate /blog from Markdown, so nothing that
 * already ships can be changed by a build step.
 *
 * templateFormats deliberately excludes "html": that is what keeps the existing
 * pages out of the template engine. They are copied byte for byte instead.
 */

const SITE = process.env.BASE_URL ?? "https://errorstate.design";

module.exports = function (eleventyConfig) {
  /* ---------------------------------------------------------------- copying */

  // every folder of the existing site, straight through
  ["assets", "media", "about", "book", "privacy", "process", "services", "work"]
    .forEach((dir) => eleventyConfig.addPassthroughCopy(dir));

  eleventyConfig.addPassthroughCopy("*.html");
  eleventyConfig.addPassthroughCopy("favicon.svg");
  eleventyConfig.addPassthroughCopy("robots.txt");

  // post media lands beside the posts it belongs to
  eleventyConfig.addPassthroughCopy({ "content/blog/images": "blog/images" });

  /* --------------------------------------------------------------- ignores */
  // Kept here rather than in a .eleventyignore file, because a dot file is
  // invisible to the GitHub web uploader and goes missing without warning.
  eleventyConfig.ignores.add("content/blog/_template.md");
  eleventyConfig.ignores.add("README.md");
  eleventyConfig.ignores.add("node_modules/**");

  /* ------------------------------------------------------------ collections */

  const published = (post) =>
    !post.data.draft || Boolean(process.env.ELEVENTY_DRAFTS);

  eleventyConfig.addCollection("posts", (api) =>
    api
      .getFilteredByGlob("content/blog/*.md")
      .filter(published)
      .sort((a, b) => new Date(b.data.date) - new Date(a.data.date))
  );

  // only tags that actually carry a published post are offered as a filter
  eleventyConfig.addCollection("blogTags", (api) => {
    const order = ["Design Systems", "SaaS UX", "Process", "Case Notes", "Community"];
    const used = new Set();
    api
      .getFilteredByGlob("content/blog/*.md")
      .filter(published)
      .forEach((post) => (post.data.tags || []).forEach((t) => used.add(t)));
    return order.filter((t) => used.has(t));
  });

  /* --------------------------------------------------------------- filters */

  eleventyConfig.addFilter("readTime", (content) => {
    const words = String(content || "").trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  });

  eleventyConfig.addFilter("isoDate", (value) =>
    new Date(value).toISOString()
  );

  eleventyConfig.addFilter("dateOnly", (value) =>
    new Date(value).toISOString().slice(0, 10)
  );

  eleventyConfig.addFilter("humanDate", (value) =>
    new Date(value).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
  );

  eleventyConfig.addFilter("rfc822", (value) => new Date(value).toUTCString());

  eleventyConfig.addFilter("tagSlug", (tag) =>
    String(tag).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  );

  /**
   * Medium's importer reads the published page and follows the image sources it
   * finds there, so every image has to be an absolute URL by the time it ships.
   * Posts still reference their media relatively, which keeps the Markdown
   * portable, and this rewrites those paths at build.
   */
  eleventyConfig.addFilter("absoluteMedia", (html, slug) =>
    String(html || "")
      .replace(/src="images\//g, `src="${SITE}/blog/images/${slug}/`)
      .replace(/src="\/blog\//g, `src="${SITE}/blog/`)
      .replace(/href="\/(?!\/)/g, `href="${SITE}/`)
  );

  eleventyConfig.addFilter("absoluteUrl", (path) =>
    String(path || "").startsWith("http") ? path : `${SITE}${path}`
  );

  /**
   * Two posts under the CTA. Shared tags come first, newest first. If a tag has
   * only this one post, the rest of the slot is filled by the newest other
   * posts rather than left empty, so the block never disappears on a young
   * blog. Remove the second pass to make it strictly tag matched.
   */
  eleventyConfig.addFilter("related", (posts, tags, selfUrl) => {
    const mine = tags || [];
    const others = posts.filter((p) => p.url !== selfUrl);
    const shared = others.filter((p) =>
      (p.data.tags || []).some((t) => mine.includes(t))
    );
    const rest = others.filter((p) => !shared.includes(p));
    return shared.concat(rest).slice(0, 2);
  });

  eleventyConfig.addFilter("byTag", (posts, tag) =>
    posts.filter((p) => (p.data.tags || []).includes(tag))
  );

  /* ------------------------------------------------------------ shortcodes */

  /**
   * A muted looping clip, the same treatment the case studies use: it plays
   * only while it is on screen and falls back to the poster frame when the
   * reader has asked for less motion.
   */
  eleventyConfig.addShortcode("video", function (name, alt, poster) {
    const slug = this.page.fileSlug;
    const base = `/blog/images/${slug}`;
    const stem = name.replace(/\.(mp4|webm)$/, "");
    return [
      `<span class="post__media">`,
      `<video data-loop autoplay muted loop playsinline preload="metadata"`,
      poster ? ` poster="${base}/${poster}"` : "",
      ` aria-label="${alt}">`,
      `<source src="${base}/${stem}.webm" type="video/webm">`,
      `<source src="${base}/${stem}.mp4" type="video/mp4">`,
      `</video></span>`,
    ].join("");
  });

  /** A Figma board, prototype or Make file, framed like the case study embeds. */
  eleventyConfig.addShortcode("figma", (url, title) => {
    const embed = url.replace(
      /^https:\/\/(www\.)?figma\.com\//,
      "https://embed.figma.com/"
    );
    const src = embed.includes("embed-host=")
      ? embed
      : `${embed}${embed.includes("?") ? "&" : "?"}embed-host=share`;
    return `<span class="post__embed"><iframe src="${src}" title="${title}" loading="lazy" allowfullscreen></iframe></span>`;
  });

  /* ------------------------------------------------------------------ setup */

  eleventyConfig.setLiquidOptions({ jsTruthy: true });

  return {
    dir: {
      input: ".",
      includes: "src/_includes",
      data: "src/_data",
      output: "_site",
    },
    templateFormats: ["njk", "md"],
    // Nunjucks runs inside Markdown so posts can use the video and figma
    // shortcodes. Literal {{ or {% in a post must be escaped with {% raw %}.
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
