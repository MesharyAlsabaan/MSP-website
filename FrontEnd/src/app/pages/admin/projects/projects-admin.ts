import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api.service';
import { Button } from '../../../shared/ui/button/button';
import { ImageUploadField } from '../../../shared/ui/image-upload/image-upload';

interface L { en: string; ar: string; }
interface Spec { label: L; value: L; }
interface Project {
  id?: string;
  slug: string;
  no: string;
  title: L;
  typology: { key: string; en: string; ar: string };
  location: L;
  year: string;
  cover: string;
  gallery: string[];
  summary: L;
  description: L[];
  specs: Spec[];
  services: L[];
  featured: boolean;
  status: 'draft' | 'published';
}

function blank(): Project {
  return {
    slug: '', no: '', title: { en: '', ar: '' },
    typology: { key: '', en: '', ar: '' },
    location: { en: '', ar: '' }, year: '', cover: '',
    gallery: [],
    summary: { en: '', ar: '' },
    description: [], specs: [], services: [],
    featured: false, status: 'published',
  };
}

/**
 * Projects CRUD for the admin CMS. Template for the other content modules:
 * list + inline editor panel, talking to the API via AdminApi('projects').
 */
@Component({
  selector: 'app-admin-projects',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Button, ImageUploadField],
  template: `
    <header class="flex items-end justify-between">
      <div>
        <p class="font-mono text-xs uppercase tracking-[0.18em] text-accent">Portfolio</p>
        <h1 class="mt-3 font-display text-3xl font-medium tracking-[-0.02em] text-ink">Projects</h1>
      </div>
      <app-button type="button" (click)="openCreate()">New project</app-button>
    </header>

    @if (loading()) {
      <p class="mt-10 text-muted">Loading…</p>
    } @else {
      <ul class="mt-8 divide-y divide-hairline border-y border-hairline">
        @for (p of items(); track p.id) {
          <li class="flex flex-wrap items-center gap-3 py-4">
            <span class="font-mono text-xs text-muted">{{ p.no }}</span>
            <span class="font-display text-lg text-ink">{{ p.title.en }}</span>
            <span class="font-mono text-xs uppercase tracking-[0.12em] text-muted">{{ p.typology.en }}</span>
            @if (p.featured) { <span class="font-mono text-xs uppercase text-accent">Featured</span> }
            <span class="font-mono text-xs uppercase"
              [class.text-accent]="p.status === 'published'"
              [class.text-muted]="p.status !== 'published'">{{ p.status }}</span>
            <div class="ms-auto flex gap-4">
              <button (click)="edit(p)" class="font-mono text-xs uppercase tracking-[0.12em] text-ink hover:text-accent">Edit</button>
              <button (click)="remove(p)" class="font-mono text-xs uppercase tracking-[0.12em] text-red-600 hover:underline">Delete</button>
            </div>
          </li>
        }
        @if (items().length === 0) { <li class="py-6 text-muted">No projects yet.</li> }
      </ul>
    }

    @if (editing()) {
      <div class="fixed inset-0 z-50 flex justify-end bg-black/40" (click)="cancel()">
        <div class="h-full w-full max-w-xl overflow-y-auto border-s border-hairline bg-surface p-8" (click)="$event.stopPropagation()">
          <h2 class="font-display text-2xl text-ink">{{ model().id ? 'Edit' : 'New' }} project</h2>

          @if (error()) { <p class="mt-4 border-s-2 border-red-500 bg-red-500/10 px-3 py-2 text-sm text-red-600">{{ error() }}</p> }

          <div class="mt-6 space-y-5">
            <div class="grid grid-cols-2 gap-3">
              <label class="block"><span class="lbl">Slug</span>
                <input [(ngModel)]="model().slug" class="inp" /></label>
              <label class="block"><span class="lbl">No.</span>
                <input [(ngModel)]="model().no" class="inp" /></label>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <label class="block"><span class="lbl">Title (EN)</span>
                <input [(ngModel)]="model().title.en" class="inp" /></label>
              <label class="block"><span class="lbl">Title (AR)</span>
                <input [(ngModel)]="model().title.ar" dir="rtl" class="inp" /></label>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <label class="block"><span class="lbl">Typology key</span>
                <input [(ngModel)]="model().typology.key" class="inp" /></label>
              <label class="block"><span class="lbl">Typology EN</span>
                <input [(ngModel)]="model().typology.en" class="inp" /></label>
              <label class="block"><span class="lbl">Typology AR</span>
                <input [(ngModel)]="model().typology.ar" dir="rtl" class="inp" /></label>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <label class="block"><span class="lbl">Location (EN)</span>
                <input [(ngModel)]="model().location.en" class="inp" /></label>
              <label class="block"><span class="lbl">Location (AR)</span>
                <input [(ngModel)]="model().location.ar" dir="rtl" class="inp" /></label>
            </div>

            <label class="block"><span class="lbl">Year</span>
              <input [(ngModel)]="model().year" class="inp" /></label>

            <div class="block"><span class="lbl">Cover image</span>
              <app-image-upload [(value)]="model().cover" /></div>

            <label class="block"><span class="lbl">Summary (EN)</span>
              <textarea [(ngModel)]="model().summary.en" rows="2" class="inp"></textarea></label>
            <label class="block"><span class="lbl">Summary (AR)</span>
              <textarea [(ngModel)]="model().summary.ar" rows="2" dir="rtl" class="inp"></textarea></label>

            <!-- Gallery -->
            <div class="border-t border-hairline pt-5">
              <div class="flex items-center justify-between">
                <span class="lbl">Gallery</span>
                <button type="button" (click)="addGalleryImage()" class="font-mono text-xs uppercase tracking-[0.12em] text-accent hover:underline">+ Add image</button>
              </div>
              <div class="mt-3 space-y-3">
                @for (img of model().gallery; track $index; let i = $index) {
                  <div class="flex items-start gap-3">
                    <app-image-upload [(value)]="model().gallery[i]" />
                    <button type="button" (click)="removeGalleryImage(i)" class="font-mono text-xs uppercase text-red-600 hover:underline">Remove</button>
                  </div>
                }
                @if (model().gallery.length === 0) { <p class="text-xs text-muted">No gallery images.</p> }
              </div>
            </div>

            <!-- Description paragraphs -->
            <div class="border-t border-hairline pt-5">
              <div class="flex items-center justify-between">
                <span class="lbl">Description paragraphs</span>
                <button type="button" (click)="addDescription()" class="font-mono text-xs uppercase tracking-[0.12em] text-accent hover:underline">+ Add paragraph</button>
              </div>
              <div class="mt-3 space-y-4">
                @for (para of model().description; track $index; let i = $index) {
                  <div class="grid grid-cols-2 gap-3">
                    <label class="block"><span class="lbl">Paragraph {{ i + 1 }} (EN)</span>
                      <textarea [(ngModel)]="model().description[i].en" rows="3" class="inp"></textarea></label>
                    <label class="block"><span class="lbl">Paragraph {{ i + 1 }} (AR)</span>
                      <textarea [(ngModel)]="model().description[i].ar" rows="3" dir="rtl" class="inp"></textarea></label>
                    <button type="button" (click)="removeDescription(i)" class="col-span-2 justify-self-start font-mono text-xs uppercase text-red-600 hover:underline">Remove paragraph</button>
                  </div>
                }
                @if (model().description.length === 0) { <p class="text-xs text-muted">No description paragraphs.</p> }
              </div>
            </div>

            <!-- Specs -->
            <div class="border-t border-hairline pt-5">
              <div class="flex items-center justify-between">
                <span class="lbl">Specifications</span>
                <button type="button" (click)="addSpec()" class="font-mono text-xs uppercase tracking-[0.12em] text-accent hover:underline">+ Add spec</button>
              </div>
              <div class="mt-3 space-y-4">
                @for (spec of model().specs; track $index; let i = $index) {
                  <div class="grid grid-cols-2 gap-3">
                    <label class="block"><span class="lbl">Label (EN)</span>
                      <input [(ngModel)]="model().specs[i].label.en" class="inp" /></label>
                    <label class="block"><span class="lbl">Label (AR)</span>
                      <input [(ngModel)]="model().specs[i].label.ar" dir="rtl" class="inp" /></label>
                    <label class="block"><span class="lbl">Value (EN)</span>
                      <input [(ngModel)]="model().specs[i].value.en" class="inp" /></label>
                    <label class="block"><span class="lbl">Value (AR)</span>
                      <input [(ngModel)]="model().specs[i].value.ar" dir="rtl" class="inp" /></label>
                    <button type="button" (click)="removeSpec(i)" class="col-span-2 justify-self-start font-mono text-xs uppercase text-red-600 hover:underline">Remove spec</button>
                  </div>
                }
                @if (model().specs.length === 0) { <p class="text-xs text-muted">No specs.</p> }
              </div>
            </div>

            <!-- Services -->
            <div class="border-t border-hairline pt-5">
              <div class="flex items-center justify-between">
                <span class="lbl">Services</span>
                <button type="button" (click)="addService()" class="font-mono text-xs uppercase tracking-[0.12em] text-accent hover:underline">+ Add service</button>
              </div>
              <div class="mt-3 space-y-4">
                @for (svc of model().services; track $index; let i = $index) {
                  <div class="grid grid-cols-2 gap-3">
                    <label class="block"><span class="lbl">Service {{ i + 1 }} (EN)</span>
                      <input [(ngModel)]="model().services[i].en" class="inp" /></label>
                    <label class="block"><span class="lbl">Service {{ i + 1 }} (AR)</span>
                      <input [(ngModel)]="model().services[i].ar" dir="rtl" class="inp" /></label>
                    <button type="button" (click)="removeService(i)" class="col-span-2 justify-self-start font-mono text-xs uppercase text-red-600 hover:underline">Remove service</button>
                  </div>
                }
                @if (model().services.length === 0) { <p class="text-xs text-muted">No services.</p> }
              </div>
            </div>

            <div class="flex items-center gap-6 border-t border-hairline pt-5">
              <label class="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" [(ngModel)]="model().featured" /> Featured
              </label>
              <label class="flex items-center gap-2 text-sm text-ink">
                Status
                <select [(ngModel)]="model().status" class="border border-hairline bg-bg px-2 py-1">
                  <option value="published">published</option>
                  <option value="draft">draft</option>
                </select>
              </label>
            </div>
          </div>

          <div class="mt-8 flex gap-3">
            <app-button type="button" (click)="save()" [disabled]="saving()">
              {{ saving() ? 'Saving…' : 'Save' }}
            </app-button>
            <app-button type="button" variant="outline" (click)="cancel()">Cancel</app-button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .lbl { font-family: var(--font-mono, monospace); font-size: .7rem; text-transform: uppercase; letter-spacing: .1em; color: var(--color-muted, #888); }
    .inp { margin-top: .4rem; width: 100%; border: 1px solid var(--color-hairline, #ddd); background: var(--color-bg, #fff); padding: .55rem .7rem; color: var(--color-ink, #111); outline: none; }
    .inp:focus { border-color: var(--color-accent, #c2703d); }
  `],
})
export class AdminProjects implements OnInit {
  private readonly admin = inject(AdminApi);
  private readonly path = 'projects';

  protected readonly items = signal<Project[]>([]);
  protected readonly loading = signal(true);
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly model = signal<Project>(blank());

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.admin.list<Project>(this.path, { page: 1, pageSize: 100, includeDrafts: true }).subscribe({
      next: (res) => { this.items.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  protected openCreate(): void { this.model.set(blank()); this.error.set(null); this.editing.set(true); }
  protected edit(p: Project): void {
    // Normalise: older/partial records may lack the rich array fields.
    const full: Project = {
      ...blank(),
      ...structuredClone(p),
      gallery: structuredClone(p.gallery ?? []),
      description: structuredClone(p.description ?? []),
      specs: structuredClone(p.specs ?? []),
      services: structuredClone(p.services ?? []),
    };
    this.model.set(full);
    this.error.set(null);
    this.editing.set(true);
  }
  protected cancel(): void { this.editing.set(false); }

  // Repeating-row editors. New array references so the @for re-renders.
  protected addGalleryImage(): void { this.model.update((m) => ({ ...m, gallery: [...m.gallery, ''] })); }
  protected removeGalleryImage(i: number): void { this.model.update((m) => ({ ...m, gallery: m.gallery.filter((_, idx) => idx !== i) })); }

  protected addDescription(): void { this.model.update((m) => ({ ...m, description: [...m.description, { en: '', ar: '' }] })); }
  protected removeDescription(i: number): void { this.model.update((m) => ({ ...m, description: m.description.filter((_, idx) => idx !== i) })); }

  protected addSpec(): void { this.model.update((m) => ({ ...m, specs: [...m.specs, { label: { en: '', ar: '' }, value: { en: '', ar: '' } }] })); }
  protected removeSpec(i: number): void { this.model.update((m) => ({ ...m, specs: m.specs.filter((_, idx) => idx !== i) })); }

  protected addService(): void { this.model.update((m) => ({ ...m, services: [...m.services, { en: '', ar: '' }] })); }
  protected removeService(i: number): void { this.model.update((m) => ({ ...m, services: m.services.filter((_, idx) => idx !== i) })); }

  protected save(): void {
    this.saving.set(true);
    this.error.set(null);
    const body = this.model();
    const req = body.id
      ? this.admin.update<Project>(this.path, body.id, body)
      : this.admin.create<Project>(this.path, body);
    req.subscribe({
      next: () => { this.saving.set(false); this.editing.set(false); this.load(); },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message;
        this.error.set(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Save failed.'));
      },
    });
  }

  protected remove(p: Project): void {
    if (!p.id || !confirm(`Delete "${p.title.en}"?`)) return;
    this.admin.remove(this.path, p.id).subscribe(() => {
      this.items.update((list) => list.filter((x) => x.id !== p.id));
    });
  }
}
