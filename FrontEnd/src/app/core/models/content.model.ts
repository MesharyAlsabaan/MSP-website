/**
 * View models for public, DB-backed content. Field names mirror the backend
 * entities (jsonb localized fields come through as `{ en, ar }`). These are the
 * shapes returned by `PublicContentService` and consumed by the public pages.
 */

export interface L {
  en: string;
  ar: string;
}

export interface ServiceItem {
  id: string;
  slug: string;
  title: L;
  shortDescription: L;
  fullDescription: L;
  icon: string;
  featured: boolean;
  sortOrder: number;
}

export interface TeamMember {
  id: string;
  name: string;
  title: L;
  bio: L;
  photo: string;
  email: string;
  phone: string;
  linkedin: string;
  sortOrder: number;
}

export interface Testimonial {
  id: string;
  clientName: string;
  role: L;
  quote: L;
  photo: string;
  rating: number;
}

export interface Partner {
  id: string;
  name: string;
  logo: string;
  url: string;
}

export interface BlogPostItem {
  id: string;
  slug: string;
  title: L;
  category: string;
  excerpt: L;
  body: L;
  cover: string;
  author: string;
  publishedAt: string | null;
}

/**
 * Company / contact info. Stored as individual settings keys on the backend and
 * returned together as one object by `GET /settings`. All optional.
 */
export interface CompanyInfo {
  companyName?: L;
  tagline?: L;
  phone?: string;
  whatsapp?: string;
  email?: string;
  addressEn?: string;
  addressAr?: string;
  cairoPhone?: string;
  cairoAddressEn?: string;
  cairoAddressAr?: string;
  cairoMapUrl?: string;
  workingHours?: L;
  social?: { linkedin?: string; instagram?: string; x?: string };
}
