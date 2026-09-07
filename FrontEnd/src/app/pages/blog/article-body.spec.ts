import { parseArticleBody } from './article-body';

describe('parseArticleBody', () => {
  it('turns level-two markers and blank-line text into ordered safe blocks', () => {
    expect(parseArticleBody('Opening paragraph.\n\n## A considered arrival\n\nSecond paragraph.')).toEqual([
      { type: 'paragraph', text: 'Opening paragraph.' },
      { type: 'heading', text: 'A considered arrival' },
      { type: 'paragraph', text: 'Second paragraph.' },
    ]);
  });

  it('returns no blocks for blank content', () => {
    expect(parseArticleBody(' \n\n ')).toEqual([]);
  });

  it('keeps HTML-looking content as literal text', () => {
    expect(parseArticleBody('<script>alert("x")</script>')).toEqual([
      { type: 'paragraph', text: '<script>alert("x")</script>' },
    ]);
  });
});
