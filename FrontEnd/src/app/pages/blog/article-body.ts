export type ArticleBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string };

/**
 * Converts the deliberately small CMS writing format into display blocks.
 * Angular interpolates every block as text, so editor input is never treated
 * as HTML. A block beginning with `## ` is a section heading; all other
 * non-empty blocks are paragraphs.
 */
export function parseArticleBody(body: string): ArticleBlock[] {
  return body
    .split(/\r?\n\s*\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((text): ArticleBlock =>
      text.startsWith('## ')
        ? { type: 'heading', text: text.slice(3).trim() }
        : { type: 'paragraph', text },
    );
}
