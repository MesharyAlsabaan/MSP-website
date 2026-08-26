import { Transform } from 'class-transformer';

/**
 * Trims and lowercases an email before validation.
 *
 * Mail addresses are not case-sensitive, and a pasted address often carries a
 * stray space — neither should turn into "invalid credentials" or a rejected
 * form. Apply above `@IsEmail()`.
 */
export function NormalizeEmail(): PropertyDecorator {
  return Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}
