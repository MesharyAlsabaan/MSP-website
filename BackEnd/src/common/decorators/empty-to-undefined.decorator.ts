import { Transform } from 'class-transformer';

/**
 * Treats an empty string as "not provided".
 *
 * Admin forms bind every optional field to `''` rather than leaving it out of
 * the payload, and `@IsOptional()` only skips validation for `undefined`/`null`
 * — so a blank `email`/date input would otherwise fail format validation.
 * Apply above the format validator on optional fields.
 */
export function EmptyToUndefined(): PropertyDecorator {
  return Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  );
}
