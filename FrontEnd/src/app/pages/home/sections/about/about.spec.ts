import { TestBed } from '@angular/core/testing';
import { TranslationService } from '../../../../core/services/translation.service';
import { About } from './about';

describe('Home About section', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [About],
      providers: [
        { provide: TranslationService, useValue: { pick: (value: { en: unknown }) => value.en } },
      ],
    }).compileComponents();
  });

  it('shows 2010 as the founding year', () => {
    const fixture = TestBed.createComponent(About);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Riyadh, 2010');
    expect(text).not.toContain('2012');
  });
});
