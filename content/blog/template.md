---
# Copy this file, rename it to your slug, and fill it in.
# The build ignores _template.md, so it never publishes.

# The headline. Also the <h1> and the meta title. Keep it under about 70
# characters so search results do not cut it off.
title: "The headline of the post"

# The URL. Lowercase, words joined by single hyphens, no dates, no stop words.
# The post publishes at /blog/<slug>/ and this must match the file name.
slug: "the-headline-of-the-post"

# Publish date, YYYY-MM-DD. Drives the ordering on the index, the feed and the
# schema. Backdating an imported post is fine, keep its original date.
date: "2026-01-15"

# Exactly one of: Muhammad, Ammad Tareen, Error State.
# Error State is the house byline for anything not written by one person.
author: "Error State"

# The sentence under the title, and the meta description that search and social
# show. Maximum 155 characters, write it as a claim, not a teaser.
description: "One sentence that says what the reader gets, under 155 characters."

# One or more of: Design Systems, SaaS UX, Process, Case Notes, Community.
# The first tag is the eyebrow on the post and decides the related posts.
tags: ["SaaS UX"]

# The thumbnail. A file name only: it must sit in
# content/blog/images/<slug>/ beside this post. 1280x720 or wider.
# This is the card on /blog/ and the image social sites show on a pasted
# link, so keep small text out of it: the card renders it at a third size.
thumbnail: "thumbnail.jpg"

# What the thumbnail shows, for screen readers. Describe the content,
# never write "image of".
thumbnailAlt: "What the thumbnail actually shows"

# Optional. The image at the top of the post. Leave both lines out and the
# thumbnail is used, which is the usual case. Name a different file when the
# post opens on something else, or set `lead: false` for no image at the top.
# Every other image in the post goes in the body, not here.
# lead: "opening-shot.jpg"
# leadAlt: "What the opening image actually shows"

# Optional. true keeps the post out of the site completely: no page, no index
# entry, no feed, no sitemap. Delete the line or set false to publish.
draft: true

# Optional. If the piece ran somewhere else first, the URL. It prints a line at
# the foot of the post. Leave it out for anything written here first, which is
# the normal case, since this site is where posts are published first.
originalUrl: ""
---

Open with the claim, not a wind up. One or two sentences saying what the reader
walks away with. This paragraph is what people skim before deciding to stay.

## A section heading

Body copy. Headings go h2 for sections and h3 for anything under them. Never
skip a level, and never use a second h1: the title above is the only one.

Images sit next to the post in `content/blog/images/<slug>/` and are referenced
by file name alone. The build rewrites the path to an absolute URL, which is
what Medium's importer needs.

![What this image shows](images/example.jpg)

A looping clip takes the file name, the description, and an optional poster
frame. Supply both an .mp4 and a .webm with the same stem:

{% video "demo.mp4", "A run through the onboarding flow", "demo.jpg" %}

A Figma board, prototype or Make file. The file has to be shared as "anyone
with the link can view" or it renders empty:

{% figma "https://www.figma.com/board/FILE_KEY/Board-Name?node-id=0-1", "What the board shows" %}

Code blocks are fenced, with the language after the backticks:

```css
.token { color: var(--red); }
```

### A subsection

Lists, quotes and tables all work.

> A pulled quote carries more weight than a bolded sentence.

Close on what to do next, not on a summary. The booking CTA is added
automatically under every post, so do not write your own.
