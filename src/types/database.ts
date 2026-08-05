// Auto-generated shape — mirrors supabase migrations exactly
// Run `supabase gen types typescript` to regenerate after schema changes

export type UserRole = "customer" | "admin";
export type ProductStatus = "draft" | "active" | "archived";
export type OrderStatus =
  "pending" | "confirmed" | "dispatched" | "delivered" | "cancelled" | "refunded";
export type PaymentMethod = "razorpay" | "cod" | "upi";
export type NotificationChannel = "email" | "sms" | "whatsapp" | "push";
export type NotificationStatus = "queued" | "sent" | "failed" | "skipped";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  default_size_scale_id: string | null;
  badge_label: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FabricOption {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ColourOption {
  id: string;
  name: string;
  hex_code: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SizeScale {
  id: string;
  name: string; // 'age_infant' | 'age_kids' | 'age_teens' | 'free_size' | 'dress_material'
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SizeOption {
  id: string;
  scale_id: string;
  label: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  colour_id: string | null;
  size_id: string | null;
  stock_count: number;
  price_override: number | null; // paise; null = use parent product price
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined relations
  colour?: ColourOption;
  size?: SizeOption;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  subtitle: string | null;
  slug: string;
  description: string | null;
  price: number; // paise
  compare_price: number | null; // paise
  badge: string | null;
  status: ProductStatus;
  is_unstitched: boolean;
  fabric: string | null; // free-text bridge column — mirrored from fabric_id's name at save time
  fabric_id: string | null;
  embroidery: string | null;
  care: string | null;
  stock_count: number;
  rating_avg: number;
  rating_count: number;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined relations
  category?: Category;
  images?: ProductImage[];
  pieces?: ProductPiece[];
  includes?: ProductInclude[];
  fabric_option?: FabricOption;
  variants?: ProductVariant[];
}

export interface ProductPiece {
  id: string;
  product_id: string;
  piece_order: number;
  piece_name: string;
  length: string | null;
  width: string | null;
  weight: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  cloudinary_id: string | null;
  sort_order: number;
  is_primary: boolean;
  alt_text: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProductInclude {
  id: string;
  product_id: string;
  sort_order: number;
  description: string;
  created_at: string;
  deleted_at: string | null;
}

export interface Address {
  id: string;
  customer_id: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  shipping_address_id: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  payment_id: string | null;
  razorpay_order_id: string | null;
  idempotency_key: string | null;
  subtotal: number; // paise
  delivery_charge: number; // paise
  discount: number; // paise
  total: number; // paise
  notes: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  items?: OrderItem[];
  shipping_address?: Address;
  customer?: Profile;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  variant_id: string | null;
  variant_label: string | null; // snapshot at purchase time, e.g. "Maroon, 3-4 years"
  quantity: number;
  unit_price: number; // paise
  total_price: number; // paise
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CartItem {
  id: string;
  customer_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
  // Joined
  product?: Product;
  variant?: ProductVariant;
}

export interface Review {
  id: string;
  product_id: string;
  customer_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  customer?: Pick<Profile, "full_name">;
}

export interface AuditLog {
  id: number;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  actor_id: string | null;
  created_at: string;
}

export interface SiteSetting {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

// ── Utility types ────────────────────────────────────────────────────
/** Converts paise (integer) to rupees string: 99900 → '₹999' */
export const formatPrice = (paise: number): string => `₹${(paise / 100).toLocaleString("en-IN")}`;

/** Calculates discount percentage */
export const discountPercent = (price: number, comparePrice: number): number =>
  Math.round((1 - price / comparePrice) * 100);
