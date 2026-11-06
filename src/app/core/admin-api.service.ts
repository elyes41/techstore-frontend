import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { toParams } from './api.service';
import {
  AdminReview, Coupon, CouponForm, Id, ReviewStatus,
  Category, DashboardStats, OrderDetail, OrderStatus, OrderSummary, PageResult, PaymentStatus, ProductDetail,
  ProductForm, ProductSummary,
} from './models';

export interface OrderUpdate {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private http = inject(HttpClient);

  stats() {
    return this.http.get<DashboardStats>('/api/admin/stats');
  }

  // Produits
  products(f: { q?: string; categoryId?: Id | null; status?: string; sort?: string; page?: number; size?: number }) {
    return this.http.get<PageResult<ProductSummary>>('/api/admin/products', { params: toParams(f) });
  }

  product(id: Id) {
    return this.http.get<ProductDetail>(`/api/admin/products/${id}`);
  }

  createProduct(form: ProductForm) {
    return this.http.post<ProductDetail>('/api/admin/products', form);
  }

  updateProduct(id: Id, form: ProductForm) {
    return this.http.put<ProductDetail>(`/api/admin/products/${id}`, form);
  }

  updateStock(id: Id, stock: number) {
    return this.http.patch<ProductDetail>(`/api/admin/products/${id}/stock`, { stock });
  }

  deleteProduct(id: Id) {
    return this.http.delete<void>(`/api/admin/products/${id}`);
  }

  uploadImage(file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<{ url: string }>('/api/admin/uploads', body);
  }

  // Catégories
  categories() {
    return this.http.get<Category[]>('/api/admin/categories');
  }

  createCategory(name: string) {
    return this.http.post<Category>('/api/admin/categories', { name });
  }

  renameCategory(id: Id, name: string) {
    return this.http.put<Category>(`/api/admin/categories/${id}`, { name });
  }

  deleteCategory(id: Id) {
    return this.http.delete<void>(`/api/admin/categories/${id}`);
  }

  // Avis
  reviews(f: { status?: ReviewStatus | ''; page?: number }) {
    return this.http.get<PageResult<AdminReview>>('/api/admin/reviews', { params: toParams(f) });
  }

  moderateReview(id: Id, status: ReviewStatus) {
    return this.http.patch<AdminReview>(`/api/admin/reviews/${id}`, { status });
  }

  deleteReview(id: Id) {
    return this.http.delete<void>(`/api/admin/reviews/${id}`);
  }

  // Codes promo
  coupons() {
    return this.http.get<Coupon[]>('/api/admin/coupons');
  }

  createCoupon(form: CouponForm) {
    return this.http.post<Coupon>('/api/admin/coupons', form);
  }

  updateCoupon(id: Id, form: CouponForm) {
    return this.http.put<Coupon>(`/api/admin/coupons/${id}`, form);
  }

  deleteCoupon(id: Id) {
    return this.http.delete<void>(`/api/admin/coupons/${id}`);
  }

  // Commandes
  orders(f: { status?: OrderStatus | ''; q?: string; page?: number; size?: number }) {
    return this.http.get<PageResult<OrderSummary>>('/api/admin/orders', { params: toParams(f) });
  }

  order(id: Id) {
    return this.http.get<OrderDetail>(`/api/admin/orders/${id}`);
  }

  updateOrder(id: Id, body: OrderUpdate) {
    return this.http.patch<OrderDetail>(`/api/admin/orders/${id}`, body);
  }

  /** (Re)envoie au client l'e-mail « votre colis est parti ». */
  notifyShipped(id: Id) {
    return this.http.post<{ sent: boolean; message: string; order: OrderDetail }>(`/api/admin/orders/${id}/notify-shipped`, {});
  }
}
