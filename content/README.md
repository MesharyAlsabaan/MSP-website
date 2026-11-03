# MSP Design — Content Collection

This folder is where you gather all the text and images for the website before
they go into the CMS.

## What's here

```
content/
├── MSP_Content_Tracker.xlsx   ← fill in all text content here (8 tabs)
└── images/
    ├── projects/      ← project cover + gallery photos
    ├── team/          ← team member headshots
    ├── services/      ← service icons / images
    ├── testimonials/  ← client photos
    ├── partners/      ← partner / client logos
    └── company/       ← logo, favicon, hero, social image
```

## How to use it

1. Open **MSP_Content_Tracker.xlsx** and start with the **Instructions** tab.
2. Fill one row per item on each tab. Example rows are marked
   *"(example — delete)"* — replace or remove them.
3. For every image, type **only the file name** in the sheet, then drop the
   actual image file in the matching `images/` subfolder.
4. Each `images/*` folder has a `_README.txt` with the exact file-naming rule
   so the names line up with the spreadsheet.

The tabs map directly to the website sections in the PRD: Company & Contact,
Projects, Team Members, Services, Testimonials, Partners, and Blog Posts.
