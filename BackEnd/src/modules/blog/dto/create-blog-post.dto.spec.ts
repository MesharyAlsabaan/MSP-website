import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBlogPostDto } from './create-blog-post.dto';

const validPost = {
  slug: 'madinah-hospitality-design',
  title: { en: 'Madinah Hotel', ar: 'فندق المدينة المنورة' },
  excerpt: { en: 'Excerpt', ar: 'مقدمة' },
  body: { en: 'Body', ar: 'المقال' },
};

describe('CreateBlogPostDto gallery', () => {
  it('accepts an array of uploaded image paths', async () => {
    const dto = plainToInstance(CreateBlogPostDto, {
      ...validPost,
      gallery: ['/uploads/01.webp', '/uploads/02.webp'],
    });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'gallery')).toBeUndefined();
  });

  it('rejects non-string gallery items', async () => {
    const dto = plainToInstance(CreateBlogPostDto, {
      ...validPost,
      gallery: ['/uploads/01.webp', 2],
    });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'gallery')).toBeDefined();
  });
});
