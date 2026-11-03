import { Injectable, signal, computed } from '@angular/core';

/**
 * Tracks the number of in-flight HTTP requests so the UI can show a global
 * loading indicator. Reference-counted so overlapping requests behave.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly count = signal(0);
  readonly isLoading = computed(() => this.count() > 0);

  start(): void {
    this.count.update((c) => c + 1);
  }

  stop(): void {
    this.count.update((c) => Math.max(0, c - 1));
  }
}
