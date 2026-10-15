import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from '../../core/services/translation.service';

/**
 * Localizes an internal link for the active edition:
 * `'/contact' | loc` → `/ar/contact` in Arabic; `['/projects', slug] | loc`
 * prefixes the first segment the same way. Write links in English; the pipe
 * adds `/ar`. Impure because the language is a signal, not an input.
 */
@Pipe({ name: 'loc', pure: false })
export class LocPipe implements PipeTransform {
  private readonly i18n = inject(TranslationService);

  transform(link: string): string;
  transform(link: readonly unknown[]): unknown[];
  transform(link: string | readonly unknown[]): string | unknown[] {
    if (typeof link === 'string') return this.i18n.path(link);
    const [first, ...rest] = link;
    return [typeof first === 'string' ? this.i18n.path(first) : first, ...rest];
  }
}
