import { Pipe, PipeTransform } from '@angular/core';
import { assetUrl } from '../../core/utils/asset-url';

/**
 * Resolves a stored image string (upload URL, static path, or bare filename) to a
 * usable `src`. See {@link assetUrl}. Usage: `[src]="item.cover | asset"`.
 */
@Pipe({ name: 'asset' })
export class AssetPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return assetUrl(value);
  }
}
