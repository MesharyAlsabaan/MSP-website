import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminProjectSync } from './project-sync-admin';
import { API, item, status } from './project-sync.fixtures';
import { SyncItem } from './project-sync.models';

describe('AdminProjectSync (overview)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminProjectSync],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => vi.restoreAllMocks());

  /** Renders the page with the given folders and answers its first requests. */
  function render(items: SyncItem[], s = status()) {
    const fixture = TestBed.createComponent(AdminProjectSync);
    fixture.detectChanges();
    http.expectOne(`${API}/status`).flush({ data: s });
    http.expectOne(`${API}/items`).flush({ data: items });
    http.expectOne(`${API}/runs?limit=30`).flush({
      data: [
        { id: 'r1', trigger: 'schedule', dryRun: false, status: 'succeeded', createdAt: '2026-10-29T16:00:00Z', finishedAt: null, requestedBy: '', error: '' },
        { id: 'r0', trigger: 'manual', dryRun: false, status: 'failed', createdAt: '2026-10-29T05:00:00Z', finishedAt: null, requestedBy: 'owner@msp.sa', error: 'Drive 403' },
      ],
    });
    fixture.detectChanges();
    // Cover thumbnails load through the authenticated API.
    http.match((r) => r.url.includes('/images/')).forEach((r) => r.flush(new Blob(['x'], { type: 'image/webp' })));
    const el = fixture.nativeElement as HTMLElement;
    const q = (sel: string) => el.querySelector(`[data-test="${sel}"]`) as HTMLElement;
    return { fixture, el, q };
  }

  const folders = () => [
    item(),
    item({ id: 'i-17', folderName: '17_private-twin-villa-riyadh', title: 'Private Twin Villa', blocking: ['The Arabic summary is missing'], aiText: false }),
    item({ id: 'i-15', folderName: '15_x', title: 'Serviced Apartments', state: 'linked', mode: 'linked', cover: '' }),
    item({ id: 'i-20', folderName: '20_y', title: 'Radisson Blu', state: 'published', projectId: 'p20', cover: '' }),
    item({ id: 'i-23', folderName: '23_z', title: 'Hammam', state: 'failed', issues: ['Drive download interrupted'], cover: '' }),
  ];

  it('shows the queues: new, pending, ready, published and errors', () => {
    const { q } = render(folders());
    expect(q('tiles').textContent).toMatch(/2\s*New projects detected/);
    expect(q('tiles').textContent).toMatch(/2\s*Pending approval/);
    expect(q('tiles').textContent).toMatch(/1\s*Ready to approve/);
    expect(q('tiles').textContent).toMatch(/1\s*Published by the sync/);
    expect(q('tiles').textContent).toMatch(/1\s*Errors/);
    expect(q('connections').textContent).toContain('Google Drive: connected');
  });

  it('lists what each pending project still needs and links to its review page', () => {
    const { q } = render(folders());
    const rows = q('items').querySelectorAll('li');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Ready to approve');
    expect(rows[0].textContent).toContain('AI-written text');
    expect(rows[0].querySelector('a')!.getAttribute('href')).toBe('/admin/project-sync/i-16');
    expect(rows[1].textContent).toContain('1 to complete');
  });

  it('switches tabs: errors show failed folders and failed runs; existing projects are not editable', () => {
    const { fixture, q } = render(folders());
    q('tab-errors').click();
    fixture.detectChanges();
    expect(q('items').textContent).toContain('Drive download interrupted');
    expect(fixture.nativeElement.textContent).toContain('Drive 403');

    q('tab-existing').click();
    fixture.detectChanges();
    expect(q('items').querySelector('a')!.getAttribute('href')).toBeNull();
  });

  it('runs now after confirmation, and rehearses without asking', () => {
    const ask = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { fixture, q } = render([]);
    q('run-now').click();
    expect(ask).toHaveBeenCalled();
    const run = http.expectOne(`${API}/run`);
    expect(run.request.body).toEqual({ dryRun: false });
    run.flush({ data: { started: true } });
    fixture.detectChanges();
    expect(q('notice').textContent).toContain('Sync started');
    expect(q('run-now').hasAttribute('disabled')).toBe(true);
  });

  it('does not run when the confirmation is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { q } = render([]);
    q('run-now').click();
    http.expectNone(`${API}/run`);
    q('rehearse').click();
    expect(http.expectOne(`${API}/run`).request.body).toEqual({ dryRun: true });
  });

  it('pauses and resumes the automation', () => {
    const { fixture, q } = render([]);
    q('toggle').click();
    const req = http.expectOne(`${API}/control`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ enabled: false });
    req.flush({ data: {} });
    fixture.detectChanges();
    expect(q('toggle').textContent).toContain('Resume automation');
  });

  it('opens a run report in the history', () => {
    const { fixture, q } = render([]);
    q('tab-history').click();
    fixture.detectChanges();
    (q('runs').querySelector('button') as HTMLElement).click();
    http.expectOne(`${API}/runs/r1`).flush({
      data: {
        id: 'r1', status: 'succeeded', reportText: 'MSP PROJECT SYNC REPORT',
        report: { summary: { scanned: 34, published: 1 }, detected: [], pending: [], attention: [], failed: [], issues: [], ownerActions: ['Review and approve 2 project(s)'] },
      },
    });
    fixture.detectChanges();
    expect(q('runs').textContent).toContain('Review and approve 2 project(s)');
    expect(q('runs').textContent).toContain('MSP PROJECT SYNC REPORT');
  });
});
