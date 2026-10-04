/**
 * Site wide data.
 *
 * `url` is the origin every canonical, feed link, Open Graph tag and image src
 * is built from. Medium's importer follows the image sources it finds on the
 * published page, so the shipped build has to write them absolute. Setting
 * BASE_URL to an empty string makes them relative instead, which is what makes
 * the local preview show its own images:
 *
 *     BASE_URL= npm run serve
 *
 * The Netlify build leaves BASE_URL unset, so production is always absolute.
 */
const url = process.env.BASE_URL ?? "https://errorstate.design";

module.exports = {
  name: "Error State",
  url,
  tagline: "An embedded design team for SaaS",
  booking: "/book/",
  blogTags: ["Design Systems", "SaaS UX", "Process", "Case Notes", "Community"],
};
