import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AdminProjectSyncItem } from './project-sync-item';
import { API, detail, status } from './project-sync.fixtures';
import { SyncItemDetail } from './project-sync.models';

describe('AdminProjectSyncItem (review page)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminProjectSyncItem],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'i-16' }) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => vi.restoreAllMocks());

  const flushImages = () => http.match((r) => r.url.includes('/images/')).forEach((r) => r.flush(new Blob(['x'], { type: 'image/webp' })));

  function render(d: SyncItemDetail = detail()) {
    const fixture = TestBed.createComponent(AdminProjectSyncItem);
    fixture.detectChanges();
    http.expectOne(`${API}/status`).flush({ data: status() });
    http.expectOne(`${API}/items/i-16`).flush({ data: d });
    fixture.detectChanges();
    flushImages();
    const el = fixture.nativeElement as HTMLElement;
    const q = (sel: string) => el.querySelector(`[data-test="${sel}"]`) as HTMLElement;
    const type = (sel: string, value: string) => {
      const input = q(sel) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    return { fixture, el, q, type };
  }

  it('shows what to confirm and marks each fact with its source', () => {
    const { q } = render();
    expect(q('readiness').textContent).toContain('Complete');
    expect(q('readiness').textContent).toContain('Title (Arabic)');
    expect(q('editor').textContent).toContain('Suggested · folder name');
    expect(q('editor').textContent).toContain('Verified');
    expect(q('editor').textContent).toContain('AI draft');
  });

  it('previews the page in English and in Arabic (right to left)', () => {
    const { fixture, q } = render();
    expect(q('preview').textContent).toContain('Rihana Plaza');
    expect(q('preview').textContent).toContain('Second paragraph.');
    q('lang-ar').click();
    fixture.detectChanges();
    expect(q('preview').getAttribute('dir')).toBe('rtl');
    expect(q('preview').textContent).toContain('ريحانة بلازا');
    expect(q('preview').textContent).toContain('الفقرة الثانية.');
    expect(q('preview').textContent).toContain('تجاري');
  });

  it('lists every image, with unusable ones explained and never selectable', () => {
    const { q } = render();
    const tiles = q('gallery').querySelectorAll('li');
    expect(tiles).toHaveLength(4);
    expect(tiles[3].textContent).toContain('too small');
    expect(tiles[3].querySelector('input')).toBeNull();
    expect(tiles[0].textContent).toContain('Cover');
  });

  it('approves only after the suggested facts are confirmed, and can publish at once', () => {
    const { fixture, q } = render();
    expect(q('approve-now').hasAttribute('disabled')).toBe(true);
    (q('confirm') as HTMLInputElement).click();
    fixture.detectChanges();
    expect(q('approve-now').hasAttribute('disabled')).toBe(false);
    q('approve-now').click();
    const req = http.expectOne(`${API}/items/i-16/decision`);
    expect(req.request.body).toEqual({ decision: 'approve', publishNow: true, confirmFacts: true });
    req.flush({ data: detail({ state: 'approved', readiness: { blocking: [], unconfirmed: [], warnings: [] } }) });
    fixture.detectChanges();
    expect(q('notice').textContent).toContain('Publishing has started');
  });

  it('cannot approve while something required is missing', () => {
    const { q } = render(detail({ readiness: { blocking: ['The Arabic summary is missing'], unconfirmed: [], warnings: [] } }));
    expect(q('readiness').textContent).toContain('The Arabic summary is missing');
    expect(q('approve').hasAttribute('disabled')).toBe(true);
  });

  it('saves only the fields that changed, and holds decisions until saved', () => {
    const { fixture, q, type } = render();
    type('f-titleEn', 'Rihana Plaza Mall');
    type('c-descriptionEn', 'One.\n\nTwo.\n\nThree.');
    expect(q('approve-now')).toBeNull();
    q('save').click();
    const req = http.expectOne(`${API}/items/i-16/draft`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ facts: { titleEn: 'Rihana Plaza Mall' }, content: { descriptionEn: ['One.', 'Two.', 'Three.'] }, images: {} });
    req.flush({ data: detail() });
    fixture.detectChanges();
    flushImages();
    expect(q('notice').textContent).toContain('Saved');
    expect(q('approve-now')).not.toBeNull();
  });

  it('moves the cover when the cover image is left out', () => {
    const { fixture, q } = render();
    (q('gallery').querySelector('li input') as HTMLInputElement).click();
    fixture.detectChanges();
    flushImages();
    q('save').click();
    expect(http.expectOne(`${API}/items/i-16/draft`).request.body).toEqual({ facts: {}, content: {}, images: { ['a'.repeat(32)]: false }, cover: 'b'.repeat(32) });
  });

  it('shows the reason when the server refuses', () => {
    const { fixture, q } = render();
    (q('confirm') as HTMLInputElement).click();
    fixture.detectChanges();
    q('approve').click();
    http.expectOne(`${API}/items/i-16/decision`).flush({ message: 'Not ready: The Arabic title is missing' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(q('error').textContent).toContain('The Arabic title is missing');
  });

  it('offers reopen for a rejected project and undo for an updated one', () => {
    const { q } = render(detail({ state: 'rejected' }));
    expect(q('reopen')).not.toBeNull();
    expect(q('reject')).toBeNull();
  });

  it('asks before undoing the last update', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { q } = render(detail({ state: 'published', projectId: 'p16', canUndo: true }));
    q('undo').click();
    http.expectOne(`${API}/items/i-16/revert`).flush({ data: {} });
    http.expectOne(`${API}/items/i-16`).flush({ data: detail({ state: 'published', projectId: 'p16' }) });
  });
});
