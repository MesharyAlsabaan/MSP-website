import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslationService } from '../../../../core/services/translation.service';
import { Header } from './header';

@Component({ template: '' })
class TestPage {}

describe('Header mobile navigation', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideRouter([{ path: 'about', component: TestPage }]),
        {
          provide: TranslationService,
          useValue: {
            pick: (value: { en: string }) => value.en,
            isArabic: () => false,
            lang: () => 'en',
            toggle: () => {},
          },
        },
      ],
    }).compileComponents();
  });

  it('renders the official MSP logo with the consultancy label', () => {
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    const brand = element.querySelector<HTMLAnchorElement>('a[aria-label="MSP Engineering Consultancy"]');
    const logo = brand?.querySelector<HTMLImageElement>('img');

    expect(brand).toBeTruthy();
    expect(brand?.getAttribute('aria-label')).toBe('MSP Engineering Consultancy');
    expect(logo?.getAttribute('src')).toBe('/images/msp-logo.png');
    expect(logo?.getAttribute('alt')).toBe('MSP Designs');
  });

  it('uses clear client-facing labels in the primary navigation', () => {
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    const labels = Array.from(
      element.querySelectorAll<HTMLAnchorElement>('header nav > ul a'),
      (link) => link.textContent?.trim(),
    );

    expect(labels).toEqual(['About', 'Services', 'Projects', 'Team', 'Insights', 'Contact']);
  });

  it('opens an accessible menu containing every public navigation link', () => {
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    const trigger = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Open navigation"]',
    );
    expect(trigger).toBeTruthy();
    trigger!.click();
    fixture.detectChanges();

    expect(trigger!.getAttribute('aria-expanded')).toBe('true');
    const menu = element.querySelector<HTMLElement>('[role="dialog"]');
    expect(menu).toBeTruthy();
    expect(
      Array.from(menu!.querySelectorAll<HTMLAnchorElement>('a')).map((a) =>
        a.getAttribute('href'),
      ),
    ).toEqual(['/about', '/services', '/projects', '/team', '/blog', '/contact']);
  });

  it('closes the menu when Escape is pressed', () => {
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Open navigation"]',
    );
    trigger!.click();
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(element.querySelector('[role="dialog"]')).toBeNull();
    expect(trigger!.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes the menu after a navigation link is selected', async () => {
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Open navigation"]',
    )!;
    trigger.click();
    fixture.detectChanges();

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    click.preventDefault();
    element.querySelector<HTMLAnchorElement>('[role="dialog"] a')!.dispatchEvent(click);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });

  it('closes the menu after a pointer click outside the header', () => {
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Open navigation"]',
    )!;
    trigger.click();
    fixture.detectChanges();

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });
});
