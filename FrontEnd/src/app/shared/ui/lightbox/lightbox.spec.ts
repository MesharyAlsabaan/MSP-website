import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslationService } from '../../../core/services/translation.service';
import { Lightbox } from './lightbox';

@Component({
  imports: [Lightbox],
  template: `
    <app-lightbox
      [images]="images"
      caption="Al Munsiyah"
      [(index)]="index"
      [(open)]="open"
    />
  `,
})
class Host {
  readonly images = ['/api/uploads/a.webp', '/api/uploads/b.webp', '/api/uploads/c.webp'];
  readonly index = signal(0);
  readonly open = signal(false);
}

const render = async () => {
  await TestBed.configureTestingModule({
    imports: [Host],
    providers: [
      {
        provide: TranslationService,
        useValue: { pick: (value: { en: string }) => value.en },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  return fixture;
};

describe('Lightbox', () => {
  it('stays closed until asked to open', async () => {
    const fixture = await render();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]'),
    ).toBeNull();
  });

  it('shows the requested image and its position in the set', async () => {
    const fixture = await render();
    fixture.componentInstance.index.set(1);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const dialog = element.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('2 / 3');
    expect(element.querySelector('[role="img"]')?.getAttribute('style')).toContain('b.webp');
  });

  it('renders the picture without an img element, so it cannot be saved directly', async () => {
    const fixture = await render();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    const dialog = (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]');
    expect(dialog?.querySelectorAll('img').length).toBe(0);
    expect(dialog?.querySelector('[role="img"]')?.getAttribute('style')).toContain(
      'background-image',
    );
  });

  it('offers labelled close and navigation controls', async () => {
    const fixture = await render();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    const labels = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('[role="dialog"] button'),
    ].map((b) => b.getAttribute('aria-label'));
    expect(labels).toContain('Close viewer');
    expect(labels).toContain('Next image');
    expect(labels).toContain('Previous image');
  });

  it('wraps around the set when moving past either end', async () => {
    const fixture = await render();
    fixture.componentInstance.index.set(2);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    const next = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('[role="dialog"] button'),
    ].find((b) => b.getAttribute('aria-label') === 'Next image') as HTMLButtonElement;
    next.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.index()).toBe(0);
  });
});
