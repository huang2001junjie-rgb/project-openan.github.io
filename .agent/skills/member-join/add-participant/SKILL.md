---
name: member-join-add-participant
description: Use when a new organization joins OpenAN, or when the user asks to add an organization, member, ecosystem partner, or participant logo, or to publish an organization-join news item. The input is the organization name, with an optional logo file; the skill looks up the organization and has the user confirm its official website, appends the logo to the end of the participant list on the home page, and asks whether to publish a join news item.
---

# Add Ecosystem Participant

Add a newly joined organization to the **Ecosystem Participants** section on the home page, and publish a join news item if the user chooses to.

## Inputs

- **Required**: organization name. If the user has not provided it, ask first; do not guess.
- **Optional**: a logo file uploaded by the user, the organization's full or short name, and the join date.
- Apart from the organization name, do not require the user to supply information that can be verified from public sources just to start the workflow.

## Workflow

### 1. Read the organization's registration first and obtain explicit confirmation

1. **Read the comments on `https://github.com/project-openan/governance/issues/4` before doing any general web search.** Find the comment that matches the given full or short organization name and record the comment's permalink; when using the GitHub API, fetch every comment page instead of looking only at the issue body or the latest comment.
2. Prefer the information in the matching comment:
    - `Organization/Company`: the organization's official name.
    - `Website`: the organization's official website, pending user confirmation.
    - `Logo Display`: permission to display the logo, plus the logo image or brand page URL.
    - `Country`, `Description of Use or Contribution`: verifiable background for the news item; plans or intentions must not be written as already-achieved results.
3. Only when no matching comment can be found, or when fields are missing, links are broken, the content is contradictory, or the comment cannot be tied to the organization, supplement with the organization's official website and other reliable public sources. Open candidate pages to verify them instead of relying on search snippets, and take care to distinguish parent companies, subsidiaries, and organizations with the same name.
4. Show the user the organization's official name, website URL, logo source, and Issue comment link, and ask for explicit confirmation. **The website must be confirmed by the user even when the Issue already provides it; do not modify any website files before confirmation.** If several comments match or the information is inconsistent, list the differences instead of choosing on your own.
5. Once the website is confirmed, ask the user: **"Also publish a news item announcing that `<organization name>` has joined OpenAN?"** This may be asked in the same round as the website confirmation, but the two answers must be recorded separately.
    - If "No": only add the logo; do not create or modify any news files.
    - If "Yes": after adding the logo, continue with Section 4.
6. Do not disclose or copy `Contact Info` from the comment, such as contact names and email addresses, unless the user explicitly asks for it and it is genuinely necessary.

### 2. Prepare the organization logo

First check `.partner-grid` in `index.html` and `src/images/participants-logo/` to confirm the organization is not already present, and follow the current file naming and display conventions. If it is a duplicate, stop and explain the situation to the user.

If a matching Issue comment exists, check its `Logo Display`: the logo may be displayed on that basis only when it is clearly **Yes** with no conditions still to be discussed; if it is **No**, the authorization is unclear, or an offline discussion is still pending, pause and ask the user to confirm. Never treat "a logo link is attached" as permission to display it.

#### The user has uploaded a logo

- Use the file the user provided, keeping the original aspect ratio without stretching or redrawing the trademark; a file explicitly uploaded by the user in the current request takes priority over material found online.
- When converting to a web-friendly format, preserve the transparent background and make sure the real file format matches the extension.

#### The user has not uploaded a logo

- **Prefer the material given in `Logo Display` of the matching Issue comment.** If the link is a direct image URL, download and verify it; if the link is an official or brand page, open the page and locate the actual logo in it rather than treating the page URL as the image URL.
- Only when the Issue provides no logo, the material link is broken, or the material is not a horizontal logo suitable for display, look for a suitable **horizontal logo** on the organization's official website header, official brand, or media resource pages, and only then fall back to a trusted brand asset library. Do not stretch non-horizontal material.
- Prefer a horizontal PNG or WebP with a transparent background; an official SVG may be converted as long as the vector content and aspect ratio are preserved. Do not substitute a square icon, a vertical lockup, a screenshot, or a low-resolution thumbnail for the horizontal logo.
- Check that the logo is readable against the website's dark background. Do not fabricate or redesign the organization's trademark with generative drawing.
- Record the Issue comment link and the actual source URL of the material. If the material cannot be confirmed as belonging to the organization, or no suitable horizontal version can be found, explain this to the user and ask them to provide one instead of substituting arbitrarily.

Save the final file to:

```text
src/images/participants-logo/<organization_slug>.<ext>
```

where `<organization_slug>` uses lowercase words joined by underscores, and the extension must match the real image format. After saving, open the image and check its content and dimensions; do not assume the material is usable just because the download succeeded.

### 3. Append the logo to the end of the list

In the `.partner-grid` of `index.html`, insert the following item **after the last existing organization and before the container's closing tag**. Do not reorder or rewrite other organizations:

```html
<a href="CONFIRMED_OFFICIAL_URL" target="_blank" rel="noopener noreferrer"><img class="partner-logo" src="./src/images/participants-logo/ORGANIZATION_SLUG.EXT" alt="ORGANIZATION_SHORT_NAME" /></a>
```

Requirements:

- `href` must use the website confirmed by the user.
- `alt` uses an accurate, concise organization name.
- Reuse the existing `.partner-logo` styles; a normal horizontal logo gets no organization-specific CSS. Make a minimal adjustment only when an actual preview reveals an obvious size problem.
- Keep the relative path, indentation, and single-line structure consistent with the other logos.
- Do not modify the disclaimer, and do not update member counts or other pages unless asked.

### 4. Publish the join news only with the user's consent

When the user agrees to publish news, **the news must be generated by calling the `member-join-publish-news` skill, located at `.agent/skills/member-join/publish-news`**. Do not re-implement the news generation rules or write a separate set of them in this skill.

Pass that skill the Issue comment permalink, the confirmed official organization name, the website, the final logo file, and the publication date; use the current date when the user has not specified one. Also pass `Country` and `Description of Use or Contribution` from the comment as the public source of facts, while preserving their planned or intended tone. The news detail page, cover, `news.html` card sync, writing conventions, and local preview all follow the requirements of `member-join-publish-news`.

After that skill returns, check that its output is complete and list the news-related files and verification results in the final report. When the user does not agree to publish news, do not call that skill.

### 5. Verify and deliver

- Check the links, image paths, escaping, and dates in the new HTML; confirm that all local resources exist and the images open.
- Start a local static server from the repository root and preview `index.html#participants`; if news is published, also preview the new detail page and `news.html`. Confirm that the new logo is last in the list, keeps a normal aspect ratio, and links to the confirmed website, and that the news cover and card display correctly. Stop the server after verification.
- Review the final diff to make sure it contains only the file changes this task needs and has not overwritten the user's existing modifications.
- Report in the same language the user uses: the confirmed website, the logo source, the modified files, the verification results, and the news publication state the user chose.
- Do not run `git commit`, `git push`, or create a PR unless the user explicitly asks for it.
