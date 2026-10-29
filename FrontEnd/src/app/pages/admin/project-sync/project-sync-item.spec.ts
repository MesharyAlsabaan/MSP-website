import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AdminProjectSyncItem } from './project-sync-item';
import { API, detail, status } from './project-sync.fixtures';
import { SyncItemDetail } from './project-sync.models';

describe('AdminProjectSyncItem (project page)', () => {
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

  it('shows that it is published, what is missing, and where each fact came from', () => {
    const { q, el } = render();
    expect(q('readiness').textContent).toContain('Published automatically');
    expect(q('missing').textContent).toContain('written description');
    expect(q('editor').textContent).toContain('From the folder name');
    expect(q('editor').textContent).toContain('Edited in the admin');
    expect(q('editor').textContent).toContain('AI · Arabic rendering');
    expect(q('editor').textContent).toContain('Written by AI');
    // No approval step: no approve button and no confirmation box.
    expect([...el.querySelectorAll('button, label')].map((b) => b.textContent).join()).not.toMatch(/approve|I confirm/i);
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

  it('publishes changes at once, without any approval step', () => {
    const { fixture, q } = render();
    expect(q('publish-now').textContent).toContain('Publish changes now');
    q('publish-now').click();
    const req = http.expectOne(`${API}/items/i-16/decision`);
    expect(req.request.body).toEqual({ decision: 'publish' });
    req.flush({ data: detail({ state: 'approved' }) });
    fixture.detectChanges();
    expect(q('notice').textContent).toContain('Publishing has started');
  });

  it('cannot publish a folder that has no usable image', () => {
    const { q } = render(detail({ state: 'draft', projectId: null, readiness: { blocking: ['No usable image in the folder'], missing: [], warnings: [] } }));
    expect(q('readiness').textContent).toContain('Cannot be published yet');
    expect(q('readiness').textContent).toContain('No usable image in the folder');
    expect(q('publish-now').hasAttribute('disabled')).toBe(true);
    expect(q('retry')).not.toBeNull();
  });

  it('saves only the fields that changed, and holds publishing until saved', () => {
    const { fixture, q, type } = render();
    type('f-titleEn', 'Rihana Plaza Mall');
    type('c-descriptionEn', 'One.\n\nTwo.\n\nThree.');
    expect(q('publish-now')).toBeNull();
    q('save').click();
    const req = http.expectOne(`${API}/items/i-16/draft`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ facts: { titleEn: 'Rihana Plaza Mall' }, content: { descriptionEn: ['One.', 'Two.', 'Three.'] }, images: {} });
    req.flush({ data: detail({ state: 'approved' }) });
    fixture.detectChanges();
    flushImages();
    expect(q('notice').textContent).toContain('Published at the next run');
    expect(q('publish-now')).not.toBeNull();
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
    q('publish-now').click();
    http.expectOne(`${API}/items/i-16/decision`).flush({ message: 'Cannot publish: No usable image in the folder' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(q('error').textContent).toContain('No usable image in the folder');
  });

  it('holds after asking, and resumes a held folder', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { fixture, q } = render();
    q('hold').click();
    const req = http.expectOne(`${API}/items/i-16/decision`);
    expect(req.request.body).toEqual({ decision: 'hold' });
    req.flush({ data: detail({ state: 'postponed' }) });
    fixture.detectChanges();
    flushImages();
    expect(q('publish-now')).toBeNull();
    q('resume').click();
    expect(http.expectOne(`${API}/items/i-16/decision`).request.body).toEqual({ decision: 'resume' });
  });

  it('shows an existing CMS project as images only, with no text editor', () => {
    const linked = detail({ mode: 'linked', state: 'linked', readiness: null });
    const { q } = render(linked);
    expect(q('linked').textContent).toContain('Its text stays as written in the Projects admin');
    expect(q('editor')).toBeNull();
    expect(q('gallery').querySelector('input')).toBeNull();
    expect(q('publish-now').textContent).toContain('Sync images now');
  });

  it('asks before undoing the last update', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { q } = render(detail({ state: 'published', projectId: 'p16', canUndo: true }));
    q('undo').click();
    http.expectOne(`${API}/items/i-16/revert`).flush({ data: {} });
    http.expectOne(`${API}/items/i-16`).flush({ data: detail({ state: 'published', projectId: 'p16' }) });
  });
});
