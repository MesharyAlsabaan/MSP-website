/**
 * CMS records that are published but must not appear on the website or in
 * search: seed placeholders that were never real content. The site filters
 * them out (lists, detail pages, prerender, sitemap) so no production data
 * has to change; unpublishing them in the admin makes these entries
 * redundant, and they can then be removed.
 */
export const EXCLUDED_POST_SLUGS: readonly string[] = [
  // Seed article: body "Long-form article body.", stock cover image.
  'designing-for-the-desert',
];
