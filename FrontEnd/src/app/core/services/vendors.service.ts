import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';

export interface VendorRequirement {
  docTypeKey: string;
  nameAr: string;
  nameEn: string;
  required: boolean;
  requiresExpiry: boolean;
}

export interface VendorCategory {
  key: string;
  nameAr: string;
  nameEn: string;
  requirements: VendorRequirement[];
}

/** Profile fields as the API expects them (mirrors VendorProfileData on the backend). */
export interface VendorProfile {
  companyName: string;
  companyNameEn?: string;
  specialty?: string;
  contactName: string;
  phone?: string;
  mobile: string;
  email: string;
  city: string;
  address?: string;
  commercialRegistrationNo: string;
  vatNo?: string;
  website?: string;
  primaryCategoryKey: string;
  secondaryCategoryKeys: string[];
  notes?: string;
  expiries?: Record<string, string>;
}

export interface SubmitResult {
  requestNumber: string;
  vendorNumber: string;
  applicationId: string;
}

export interface ResumeContext {
  requestNumber: string;
  vendorNumber: string;
  revisionNo: number;
  data: VendorProfile;
  documents: { id: string; docTypeKey: string; originalFilename: string; expiresAt: string | null; sizeBytes: number }[];
  missingItems: string[];
  note: string;
}

/** A document chosen in the form: which requirement it satisfies and the file. */
export interface ChosenDocument {
  docTypeKey: string;
  file: File;
}

/**
 * Public vendor-qualification API. Documents travel as multipart fields named
 * `doc__<docTypeKey>`; the profile travels as one JSON field called `data`.
 */
@Injectable({ providedIn: 'root' })
export class VendorsService {
  private readonly api = inject(ApiService);

  categories(): Observable<VendorCategory[]> {
    return this.api.get<ApiResponse<VendorCategory[]>>('vendors/categories').pipe(map((r) => r.data));
  }

  submit(profile: VendorProfile, documents: ChosenDocument[]): Observable<SubmitResult> {
    return this.api
      .post<ApiResponse<SubmitResult>>('vendors/applications', this.toFormData(profile, documents))
      .pipe(map((r) => r.data));
  }

  resume(token: string): Observable<ResumeContext> {
    return this.api
      .get<ApiResponse<ResumeContext>>(`vendors/applications/resume/${encodeURIComponent(token)}`)
      .pipe(map((r) => r.data));
  }

  resubmit(token: string, profile: VendorProfile, documents: ChosenDocument[]): Observable<{ requestNumber: string; revisionNo: number }> {
    return this.api
      .post<ApiResponse<{ requestNumber: string; revisionNo: number }>>(
        `vendors/applications/resume/${encodeURIComponent(token)}`,
        this.toFormData(profile, documents),
      )
      .pipe(map((r) => r.data));
  }

  private toFormData(profile: VendorProfile, documents: ChosenDocument[]): FormData {
    const form = new FormData();
    form.set('data', JSON.stringify(profile));
    for (const d of documents) form.append(`doc__${d.docTypeKey}`, d.file, d.file.name);
    return form;
  }
}
