import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import {
  provideClientHydration,
  withEventReplay,
  withNoHttpTransferCache,
} from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { authRefreshInterceptor } from './core/interceptors/auth-refresh.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),
    // No automatic HTTP transfer cache: it would inline whole API responses
    // into every prerendered page. The hero showcase carries its own slim
    // state instead (see ProjectShowcase).
    provideClientHydration(withEventReplay(), withNoHttpTransferCache()),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        authInterceptor,
        authRefreshInterceptor,
        errorInterceptor,
        loadingInterceptor,
      ]),
    ),
  ],
};
