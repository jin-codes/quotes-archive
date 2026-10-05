[한국어](README.md) | **English**

# Quotes Archive

A website for collecting quotes that stay with you, discovering them at random, and keeping them as images.

🔗 **https://quotes-archive.vercel.app**

## Browsing (no sign-in needed)

### Random quote — Surprise me
- One quote is shown large at the top; press **Surprise me** to get another.
- Shuffling only draws from quotes matching your current **language, tags, favorites, and search**. (For example, ENG + #courage + favorites only shuffles within exactly that set.)
- The same quote never appears twice in a row.

### Language — KOR / ENG
- Switch between Korean (KOR) and English (ENG) quotes with one button. KOR is the default.
- When you switch language, if the quote you were viewing has a **translation** (the same quote in the other language), it carries over to that version.

### Search
- Searches quote text, author, and tags at once.

### Two-level tag filter
- Pick a broad group first (Beginnings & Hope, Courage & Perseverance, Life & Time, Mind & Wisdom, Pain & Comfort, Relationships & Happiness, Work & Success, Literature & Philosophy, Other), then select one or more detailed tags inside it (#courage, #perseverance, …).
- Quote counts are shown next to each group and tag, and detailed tags are sorted by how often they're used.
- Only groups that have quotes in the selected language are shown.

### Pin
- Use the pin button on a quote card to **pin** it to the top. Pressing Surprise me unpins it and returns to shuffling.
- A pinned quote switches to its translation when you change the language.

### Save as image
- Saving an image is only available for the **pinned quote**. Pin a quote and a **Save image** button appears at the top, letting you download a 1080×1080 PNG containing just the quote and its author.
- Choose from gradient backgrounds or bundled landscape and texture photos; backgrounds that suit the quote's tags are **recommended** first.
- You can also **upload your own photo** as the background. (Uploaded photos stay in your browser and are never sent to a server.)
- Long quotes automatically shrink their text to fit.

### Export — Export .xlsx
- Download the quote list as an Excel (.xlsx) file with id, quote, author, category, tags, favorite flag, language, and date added.

> ⚠️ When not logged in, all settings, including favorites, reset when you refresh the page.

## When logged in

- Sign up and sign in with email and password.
- **Favorites are saved to your account**, so they persist across refreshes and devices.
- **Request additions and edits**: regular accounts can't change quotes directly. Submit a new quote or an edit, and it goes live after the administrator reviews it. In the form you can type tags or pick from the grouped tags; the language is detected from the text and can be changed manually.
- For now, only the administrator can delete quotes.

## Administrator features

- **Review queue (Pending)**: add and edit requests from users pile up here with the submitter's email, and the admin **approves or rejects** each one. For edits, you can expand a diff between the original and the proposed version.
- Quotes can be added, edited, and deleted directly, taking effect immediately with no review.
- **Import**: bulk-load quotes from an Excel file (.xlsx, .xls). If the language column is blank, it's detected from the text.

## Notes

- Features may contain bugs and may change over time.
- Background photos are from [Unsplash](https://unsplash.com).
- Built by vibe coding with [Lovable](https://lovable.dev), deployed on Vercel, with data stored in Supabase.
