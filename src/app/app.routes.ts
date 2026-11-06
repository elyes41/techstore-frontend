import { Routes } from '@angular/router';
import { adminGuard } from './core/auth';

export const routes: Routes = [
  {
    path: 'admin/connexion',
    title: 'Connexion – Administration',
    loadComponent: () => import('./admin/login').then((m) => m.LoginPage),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', title: 'Tableau de bord', loadComponent: () => import('./admin/dashboard').then((m) => m.DashboardPage) },
      { path: 'produits', title: 'Produits', loadComponent: () => import('./admin/products-list').then((m) => m.ProductsListPage) },
      { path: 'produits/nouveau', title: 'Nouveau produit', loadComponent: () => import('./admin/product-edit').then((m) => m.ProductEditPage) },
      { path: 'produits/:id', title: 'Modifier le produit', loadComponent: () => import('./admin/product-edit').then((m) => m.ProductEditPage) },
      { path: 'categories', title: 'Catégories', loadComponent: () => import('./admin/categories').then((m) => m.CategoriesPage) },
      { path: 'avis', title: 'Avis clients', loadComponent: () => import('./admin/reviews').then((m) => m.ReviewsPage) },
      { path: 'codes-promo', title: 'Codes promo', loadComponent: () => import('./admin/coupons').then((m) => m.CouponsPage) },
      { path: 'commandes', title: 'Commandes', loadComponent: () => import('./admin/orders-list').then((m) => m.OrdersListPage) },
      { path: 'commandes/:id', title: 'Commande', loadComponent: () => import('./admin/order-detail').then((m) => m.OrderDetailPage) },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./shop/shop-layout').then((m) => m.ShopLayout),
    children: [
      { path: '', title: 'TechStore – High-tech en Tunisie', loadComponent: () => import('./shop/home').then((m) => m.HomePage) },
      { path: 'catalogue', title: 'Catalogue', loadComponent: () => import('./shop/catalog').then((m) => m.CatalogPage) },
      { path: 'catalogue/:category', title: 'Catalogue', loadComponent: () => import('./shop/catalog').then((m) => m.CatalogPage) },
      { path: 'produit/:slug', title: 'Produit', loadComponent: () => import('./shop/product-page').then((m) => m.ProductPage) },
      { path: 'favoris', title: 'Mes favoris', loadComponent: () => import('./shop/wishlist-page').then((m) => m.WishlistPage) },
      { path: 'comparer', title: 'Comparer', loadComponent: () => import('./shop/compare-page').then((m) => m.ComparePage) },
      { path: 'panier', title: 'Mon panier', loadComponent: () => import('./shop/cart-page').then((m) => m.CartPage) },
      { path: 'commande/:reference', title: 'Commande confirmée', loadComponent: () => import('./shop/order-confirmation').then((m) => m.OrderConfirmationPage) },
      { path: '**', title: 'Page introuvable', loadComponent: () => import('./shop/not-found').then((m) => m.NotFoundPage) },
    ],
  },
];
