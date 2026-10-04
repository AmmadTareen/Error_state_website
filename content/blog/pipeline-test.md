---
title: "Pipeline test, safe to delete"
slug: "pipeline-test"
date: "2026-10-04"
author: "Error State"
description: "A throwaway post that exercises the build. Delete the file once the deploy goes green and the post disappears on the next build."
tags: ["Process"]
cover: "cover.png"
coverAlt: "A plain cover reading pipeline test, in the Error State palette"
---

If you are reading this on errorstate.design, the whole chain works: a Markdown
file committed to GitHub triggered a Netlify build, Eleventy generated this page,
and it published without anyone touching the deploy.

Delete `content/blog/pipeline-test.md` and the next build removes this page, the
index card, the feed entry and the sitemap line, with nothing left behind.

## What this post is checking

Everything below is a feature of the build. If any of it renders wrong, that part
is broken and the rest is fine.

### Headings and lists

Three levels of heading, an unordered list with the red square markers, and a
numbered list with the mono numerals:

- Frontmatter parsed, so the title, author, date and tag above are correct
- Read time counted from the Markdown, not the rendered HTML
- Tag chip linking to its own page at `/blog/tag/process/`

1. The post is in the index, newest first
2. It appears under the Process tag
3. It is in `/blog/rss.xml` with the full body

### Images

The image below loads from `content/blog/images/pipeline-test/` and should be
served from an absolute errorstate.design URL in the page source, which is what
Medium's importer needs.

![The pipeline test cover, used a second time to check inline images](images/cover.png)

### Code

```css
.post__body{max-width:680px;font-size:17px;line-height:1.7}
```

> A quote block, to check the red rule down the left edge.

## What this post does not check

Two things need real files, so they are not in here: the `video` shortcode needs
a matching mp4 and webm, and the `figma` shortcode needs a file shared as anyone
with the link can view. Test those on the first real post that uses them.

## If it worked

Delete this file, commit, and confirm the next build drops it. Then publish
something real.
