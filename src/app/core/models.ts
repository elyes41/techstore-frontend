/** Identifiant MongoDB (ObjectId sous forme de chaîne hexadécimale de 24 caractères). */
export type Id = string;

export interface Category {
  id: Id;
  name: string;
  slug: string;
  productCount: number;
}

export interface ProductSummary {
  id: Id;
  name: string;
  slug: string;
  sku: string | null;
  brand: string | null;
  price: number;
  oldPrice: number | null;
  stock: number;
  active: boolean;
  featured: boolean;
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  image: string | null;
  categoryId: Id | null;
  categoryName: string | null;
  categorySlug: string | null;
}

export interface ProductDetail extends Omit<ProductSummary, 'image'> {
  description: string | null;
  images: string[];
  specs: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface Facets {
  brands: string[];
  minPrice: number | null;
  maxPrice: number | null;
}

export interface ShopSettings {
  shippingFee: number;
  freeShippingThreshold: number;
  fiscalStamp: number;
  whatsappNumber: string | null;
}

export interface ProductRecommendations {
  similar: ProductSummary[];
  boughtTogether: ProductSummary[];
  alsoViewed: ProductSummary[];
  viewsLast24h: number;
}

export interface SearchSuggestions {
  products: ProductSummary[];
  categories: Category[];
  brands: string[];
}

export interface Review {
  id: Id;
  authorName: string;
  rating: number;
  title: string | null;
  comment: string | null;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface ReviewPage {
  summary: { average: number; count: number; distribution: number[] };
  items: Review[];
  page: number;
  totalPages: number;
}

export interface ReviewForm {
  authorName: string;
  rating: number;
  title: string | null;
  comment: string | null;
  orderReference: string | null;
}

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AdminReview extends Review {
  productId: Id;
  productName: string;
  productSlug: string;
  status: ReviewStatus;
}

export interface CouponQuote {
  code: string;
  discount: number;
  description: string;
}

export interface Coupon {
  id: Id;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minOrder: number;
  maxUses: number | null;
  usedCount: number;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  createdAt: string;
}

export type CouponForm = Omit<Coupon, 'id' | 'usedCount' | 'createdAt'>;

export type PaymentMethod = 'CASH_ON_DELIVERY' | 'CARD' | 'E_DINAR' | 'MOBILE_WALLET';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface CheckoutRequest {
  customerName: string;
  phone: string;
  email: string | null;
  governorate: string;
  city: string | null;
  address: string;
  note: string | null;
  paymentMethod: PaymentMethod;
  couponCode: string | null;
  items: { productId: Id; quantity: number }[];
}

export interface OrderItem {
  productId: Id | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderDetail {
  id: Id;
  reference: string;
  customerName: string;
  phone: string;
  email: string | null;
  governorate: string;
  city: string | null;
  address: string;
  note: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  subtotal: number;
  couponCode: string | null;
  discount: number;
  shippingFee: number;
  fiscalStamp: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  shippingEmailSentAt: string | null;
  shippingEmailError: string | null;
  items: OrderItem[];
}

export interface OrderSummary {
  id: Id;
  reference: string;
  customerName: string;
  phone: string;
  governorate: string;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  itemCount: number;
  createdAt: string;
}

export interface ProductForm {
  name: string;
  sku: string | null;
  brand: string | null;
  description: string | null;
  price: number;
  oldPrice: number | null;
  stock: number;
  active: boolean;
  featured: boolean;
  categoryId: Id | null;
  images: string[];
  specs: Record<string, string>;
}

export interface DashboardStats {
  productCount: number;
  activeProductCount: number;
  outOfStockCount: number;
  lowStockCount: number;
  orderCount: number;
  pendingOrderCount: number;
  pendingReviewCount: number;
  revenue: number;
  revenueLast30Days: number;
  last7Days: { day: string; orders: number; revenue: number }[];
  recentOrders: OrderSummary[];
  lowStock: { id: Id; name: string; sku: string | null; stock: number }[];
  bestSellers: { id: Id; name: string; soldCount: number; ratingAvg: number }[];
}

export interface LoginResponse {
  token: string;
  email: string;
  fullName: string | null;
  expiresAt: string;
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH_ON_DELIVERY: 'Paiement à la livraison',
  CARD: 'Carte bancaire',
  E_DINAR: 'e-Dinar',
  MOBILE_WALLET: 'Portefeuille mobile',
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: 'Non payée',
  PAID: 'Payée',
  REFUNDED: 'Remboursée',
};

export const GOVERNORATES = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba', 'Kairouan',
  'Kasserine', 'Kébili', 'Le Kef', 'Mahdia', 'La Manouba', 'Médenine', 'Monastir', 'Nabeul',
  'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
];
