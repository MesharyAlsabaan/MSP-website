import { Pipe, PipeTransform } from '@angular/core';
import { responsiveSrcset } from '../../core/utils/responsive-image';

/**
 * Responsive `srcset` for an uploaded image; pair it with a `sizes` that
 * describes the slot. Usage: `[attr.srcset]="p.cover | srcset"`.
 */
@Pipe({ name: 'srcset' })
export class SrcsetPipe implements PipeTransform {
  transform(value: string | null | undefined): string | null {
    return responsiveSrcset(value);
  }
}
