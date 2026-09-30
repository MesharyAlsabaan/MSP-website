import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { VENDOR_API_URL } from '../constants/api.constants';
import { ApiResponse, PaginatedResponse } from '../models/api-response.model';
import { VendorAccountInfo } from './vendor-session.service';

export interface VendorRequirement { docTypeKey: string; nameAr: string; nameEn: string; required: boolean; requiresExpiry: boolean; }
export interface VendorCategory { key: string; nameAr: string; nameEn: string; requirements: VendorRequirement[]; }

export interface VendorProfile {
  companyName?: string; companyNameEn?: string; specialty?: string; contactName?: string; phone?: string; mobile?: string; email?: string;
  country?: string; city?: string; address?: string; commercialRegistrationNo?: string; vatNo?: string; website?: string;
  primaryCategoryKey?: string; secondaryCategoryKeys?: string[]; notes?: string; expiries?: Record<string, string>;
}
export interface DocumentView { id: string; docTypeKey: string; originalFilename: string; expiresAt: string | null; sizeBytes: number; mime: string; }
export interface RevisionView { id: string; revisionNo: number; data: VendorProfile; submittedAt: string | null; decision: string | null; decidedAt: string | null; decisionNote: string; documents: DocumentView[]; }
export type QualificationStatus = 'draft' | 'under_review' | 'needs_completion' | 'approved' | 'rejected';
export interface MyApplication {
  vendor: { id: string; vendorNumber: string; companyName: string; primaryCategoryKey: string; secondaryCategoryKeys: string[] };
  application: { id: string; requestNumber: string | null; status: QualificationStatus; currentRevisionNo: number };
  draft: RevisionView | null;
  submitted: RevisionView | null;
  review: { action: string; missingItems: string[]; note: string; at: string } | null;
  history: { action: string; note: string; missingItems: string[]; at: string }[];
}

/**
 * Client of the OFFICE vendor service. Everything here goes to VENDOR_API_URL,
 * never to the website API; the vendor token is attached by vendorInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class VendorsService {
  private readonly http = inject(HttpClient);
  private readonly base = VENDOR_API_URL;
  private url(p: string): string { return `${this.base}/${p.replace(/^\/+/, '')}`; }
  private data<T>(o: Observable<ApiResponse<T>>): Observable<T> { return o.pipe(map((r) => r.data)); }

  // ---- public
  categories(): Observable<VendorCategory[]> { return this.data(this.http.get<ApiResponse<VendorCategory[]>>(this.url('vendor/categories'))); }

  // ---- account
  register(email: string, password: string, contactName: string) { return this.data(this.http.post<ApiResponse<{ id: string }>>(this.url('vendor/auth/register'), { email, password, contactName })); }
  resendVerification(email: string) { return this.http.post(this.url('vendor/auth/resend-verification'), { email }); }
  verify(token: string) { return this.http.post(this.url('vendor/auth/verify'), { token }); }
  login(email: string, password: string) { return this.data(this.http.post<ApiResponse<{ accessToken: string; account: VendorAccountInfo }>>(this.url('vendor/auth/login'), { email, password })); }
  forgotPassword(email: string) { return this.http.post(this.url('vendor/auth/forgot-password'), { email }); }
  resetPassword(token: string, password: string) { return this.http.post(this.url('vendor/auth/reset-password'), { token, password }); }

  // ---- my application
  mine(): Observable<MyApplication> { return this.data(this.http.get<ApiResponse<MyApplication>>(this.url('vendor/me/application'))); }
  saveDraft(patch: VendorProfile): Observable<MyApplication> { return this.data(this.http.put<ApiResponse<MyApplication>>(this.url('vendor/me/application/draft'), patch)); }
  addDocument(docTypeKey: string, file: File, expiresAt?: string): Observable<DocumentView> {
    const form = new FormData();
    form.set('docTypeKey', docTypeKey);
    if (expiresAt) form.set('expiresAt', expiresAt);
    form.set('file', file, file.name);
    return this.data(this.http.post<ApiResponse<DocumentView>>(this.url('vendor/me/application/draft/documents'), form));
  }
  removeDocument(id: string) { return this.http.delete(this.url(`vendor/me/application/draft/documents/${id}`)); }
  submit(): Observable<{ requestNumber: string; vendorNumber: string; revisionNo: number }> { return this.data(this.http.post<ApiResponse<{ requestNumber: string; vendorNumber: string; revisionNo: number }>>(this.url('vendor/me/application/submit'), {})); }
  myDocumentBlob(id: string): Observable<Blob> { return this.http.get(this.url(`vendor/me/documents/${id}`), { responseType: 'blob' }); }

  // ---- staff (vendor review) — staff token is attached by the auth interceptor
  adminList<T>(params: Record<string, string | number>): Observable<PaginatedResponse<T>> {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params)) p = p.set(k, String(v));
    return this.http.get<PaginatedResponse<T>>(this.url('admin/vendors'), { params: p });
  }
  adminGet<T>(path: string): Observable<T> { return this.data(this.http.get<ApiResponse<T>>(this.url(`admin/vendors/${path}`))); }
  adminPost<T>(path: string, body: unknown): Observable<T> { return this.data(this.http.post<ApiResponse<T>>(this.url(`admin/vendors/${path}`), body)); }
  adminDocumentBlob(id: string): Observable<Blob> { return this.http.get(this.url(`admin/vendors/documents/${id}`), { responseType: 'blob' }); }
}

/** One line the user can act on; a dead office service is named as such (nothing was saved). */
export function vendorErrorMessage(err: HttpErrorResponse, ar: boolean): string {
  if (err.status === 0) return ar ? 'تعذّر الاتصال بخدمة الموردين — لم يُحفظ شيء. تحقق من اتصالك وأعد المحاولة.' : 'Could not reach the vendor service — nothing was saved. Check your connection and try again.';
  const m = err.error?.message;
  if (Array.isArray(m)) return m.join(' · ');
  if (typeof m === 'string') return m;
  if (err.status === 401) return ar ? 'انتهت الجلسة، سجّل الدخول مجدداً.' : 'Your session has expired — please sign in again.';
  if (err.status === 429) return ar ? 'محاولات كثيرة — انتظر دقيقة ثم أعد المحاولة.' : 'Too many attempts — wait a minute and try again.';
  if (err.status === 413) return ar ? 'الملف أكبر من الحد المسموح.' : 'The file is larger than allowed.';
  return ar ? 'حدث خطأ غير متوقع. أعد المحاولة.' : 'Something went wrong. Please try again.';
}
