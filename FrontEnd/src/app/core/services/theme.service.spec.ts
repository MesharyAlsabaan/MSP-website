import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';
import { STORAGE_KEYS } from '../constants/api.constants';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    TestBed.configureTestingModule({});
  });

  it('toggles between light and dark', () => {
    const svc = TestBed.inject(ThemeService);
    svc.setTheme('light');
    svc.toggle();
    expect(svc.theme()).toBe('dark');
    svc.toggle();
    expect(svc.theme()).toBe('light');
  });

  it('setTheme updates theme and isDark', () => {
    const svc = TestBed.inject(ThemeService);
    svc.setTheme('dark');
    expect(svc.theme()).toBe('dark');
    expect(svc.isDark()).toBe(true);
  });

  it('initializes from localStorage when present', () => {
    localStorage.setItem(STORAGE_KEYS.theme, 'dark');
    const svc = TestBed.inject(ThemeService);
    expect(svc.theme()).toBe('dark');
  });

  it('applies the .dark class on <html> via effect and persists', () => {
    const svc = TestBed.inject(ThemeService);
    svc.setTheme('dark');
    TestBed.tick();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark');
  });
});
