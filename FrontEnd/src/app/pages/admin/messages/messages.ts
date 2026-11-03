import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminApi } from '../../../core/services/admin-api.service';

interface Message {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

/** Admin view of contact-form submissions: list, mark read, delete. */
@Component({
  selector: 'app-admin-messages',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    <header class="flex items-end justify-between">
      <div>
        <p class="font-mono text-xs uppercase tracking-[0.18em] text-accent">Inbox</p>
        <h1 class="mt-3 font-display text-3xl font-medium tracking-[-0.02em] text-ink">Messages</h1>
      </div>
      <span class="font-mono text-xs uppercase tracking-[0.12em] text-muted">{{ total() }} total</span>
    </header>

    @if (loading()) {
      <p class="mt-10 text-muted">Loading…</p>
    } @else if (messages().length === 0) {
      <p class="mt-10 text-muted">No messages yet.</p>
    } @else {
      <ul class="mt-8 divide-y divide-hairline border-y border-hairline">
        @for (m of messages(); track m.id) {
          <li class="py-5" [class.opacity-60]="m.read">
            <div class="flex flex-wrap items-center gap-3">
              @if (!m.read) { <span class="h-2 w-2 rounded-full bg-accent"></span> }
              <span class="font-display text-lg text-ink">{{ m.name }}</span>
              <a [href]="'mailto:' + m.email" class="text-sm text-accent">{{ m.email }}</a>
              @if (m.phone) { <span class="text-sm text-muted">{{ m.phone }}</span> }
              <span class="ms-auto font-mono text-xs text-muted">{{ m.createdAt | date: 'medium' }}</span>
            </div>
            @if (m.subject) { <p class="mt-2 font-medium text-ink">{{ m.subject }}</p> }
            <p class="mt-1 whitespace-pre-line text-muted">{{ m.message }}</p>
            <div class="mt-3 flex gap-4">
              @if (!m.read) {
                <button (click)="markRead(m)" class="font-mono text-xs uppercase tracking-[0.12em] text-ink hover:text-accent">
                  Mark read
                </button>
              }
              <button (click)="remove(m)" class="font-mono text-xs uppercase tracking-[0.12em] text-red-600 hover:underline">
                Delete
              </button>
            </div>
          </li>
        }
      </ul>
    }
  `,
})
export class AdminMessages implements OnInit {
  private readonly admin = inject(AdminApi);

  protected readonly messages = signal<Message[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.admin.list<Message>('contact', { page: 1, pageSize: 100 }).subscribe({
      next: (res) => {
        this.messages.set(res.data);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected markRead(m: Message): void {
    this.admin.patch('contact', `${m.id}/read`).subscribe(() => {
      this.messages.update((list) =>
        list.map((x) => (x.id === m.id ? { ...x, read: true } : x)),
      );
    });
  }

  protected remove(m: Message): void {
    if (!confirm(`Delete message from ${m.name}?`)) return;
    this.admin.remove('contact', m.id).subscribe(() => {
      this.messages.update((list) => list.filter((x) => x.id !== m.id));
      this.total.update((n) => Math.max(0, n - 1));
    });
  }
}
