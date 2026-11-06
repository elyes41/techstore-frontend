import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Category, CheckoutRequest, Id, CouponQuote, Facets, OrderDetail, PageResult, ProductDetail, ProductRecommendations,
  ProductSummary, ReviewForm, ReviewPage, SearchSuggestions, ShopSettings,
} from './models';

export interface CatalogFilters {
  q?: string | null;
  category?: string | null;
  brand?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  inStock?: boolean;
  promo?: boolean;
  featured?: boolean;
  minRating?: number | null;
  sort?: string | null;
  page?: number;
  size?: number;
}

/** API publique de la boutique. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  categories() {
    return this.http.get<Category[]>('/api/categories');
  }

  products(f: CatalogFilters) {
    return this.http.get<PageResult<ProductSummary>>('/api/products', { params: toParams(f) });
  }

  facets(category?: string | null) {
    return this.http.get<Facets>('/api/products/facets', { params: toParams({ category }) });
  }

  product(slug: string) {
    return this.http.get<ProductDetail>(`/api/products/${encodeURIComponent(slug)}`);
  }

  related(slug: string) {
    return this.http.get<ProductSummary[]>(`/api/products/${encodeURIComponent(slug)}/related`);
  }

  recordView(slug: string, visitorId: string) {
    return this.http.post<{ viewsLast24h: number }>(`/api/products/${encodeURIComponent(slug)}/view`, { visitorId });
  }

  recommendations(slug: string) {
    return this.http.get<ProductRecommendations>(`/api/products/${encodeURIComponent(slug)}/recommendations`);
  }

  trending(limit = 8) {
    return this.http.get<ProductSummary[]>('/api/products/trending', { params: { limit } });
  }

  forYou(ids: Id[], limit = 8) {
    return this.http.get<ProductSummary[]>('/api/recommendations/for-you', { params: { ids: ids.join(','), limit } });
  }

  compare(ids: Id[]) {
    return this.http.get<ProductDetail[]>('/api/products/compare', { params: { ids: ids.join(',') } });
  }

  suggest(q: string) {
    return this.http.get<SearchSuggestions>('/api/search/suggest', { params: { q } });
  }

  reviews(slug: string, page = 0) {
    return this.http.get<ReviewPage>(`/api/products/${encodeURIComponent(slug)}/reviews`, { params: { page } });
  }

  submitReview(slug: string, form: ReviewForm) {
    return this.http.post<{ message: string }>(`/api/products/${encodeURIComponent(slug)}/reviews`, form);
  }

  checkCoupon(code: string, subtotal: number) {
    return this.http.post<CouponQuote>('/api/coupons/check', { code, subtotal });
  }

  settings() {
    return this.http.get<ShopSettings>('/api/settings');
  }

  checkout(req: CheckoutRequest) {
    return this.http.post<OrderDetail>('/api/orders', req);
  }

  trackOrder(reference: string, phone: string) {
    return this.http.get<OrderDetail>(`/api/orders/${encodeURIComponent(reference)}`, { params: { phone } });
  }
}

/** Construit des HttpParams en ignorant les valeurs vides ; les tableaux deviennent des paramètres répétés. */
export function toParams(obj: object): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined || value === '' || value === false) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => (params = params.append(key, String(v))));
    } else {
      params = params.set(key, String(value));
    }
  }
  return params;
}
