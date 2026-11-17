---
name: preview
description: Publish a rig page as a public preview for review, or re-upload it without the lane marker. Use for a plan's "Preview for review" or "Clean up" section.
---

# preview

The host is GitHub Pages on this repo, deployed by the `preview` workflow from an Actions
artifact, so the HTML never enters git (ADR 0003). The link is the repo's Pages URL.

1. Check locally: `LANE_MARKER=<marker> scripts/preview.sh <night> var/preview/index.html`.
2. Publish: `gh workflow run preview.yml -f marker=<marker> -f night=<night>`, then
   `gh run watch <id> --exit-status`.
3. Fetch the public URL with `curl` and grep the banner: the live copy shows the marker you sent.
4. Send the link. The review issue stays open until the reviewer has looked.
5. Clean up, only after the review is in: run step 2 with `-f marker=` (empty), then confirm the
   live banner reads `no marker set`.
