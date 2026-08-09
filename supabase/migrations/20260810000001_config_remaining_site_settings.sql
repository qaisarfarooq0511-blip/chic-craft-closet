-- Migration: 20260810000001_config_remaining_site_settings.sql
-- Purpose: move the last 5 admin.config.tsx sections (Tags, Shipping Partners,
--          Cancellation Reasons, HSN Codes, Global FAQs) off the dead
--          localStorage-only config path (see CHANGELOG for the store-sync.ts
--          finding) and onto real site_settings rows. Values below are copied
--          verbatim from src/lib/storage.ts's DEFAULT_CONFIG.
-- Lane: Full Lane
-- Rollback: DELETE FROM site_settings WHERE key IN
--           ('config_tags','config_shipping_partners','config_cancellation_reasons',
--            'config_hsn_codes','config_global_faqs');

INSERT INTO site_settings (key, value, description)
VALUES
  ('config_tags',
   $json$["pashmina","ivory","chikankari","cotton","earrings","kundan","festive","bridal","casual"]$json$::jsonb,
   'Product tags for rule-based homepage sections'),

  ('config_shipping_partners',
   $json$["Delhivery","Blue Dart","DTDC","India Post","Shiprocket","Ekart","XpressBees"]$json$::jsonb,
   'Available shipping partners'),

  ('config_cancellation_reasons',
   $json$["Customer requested cancellation","Out of stock","Address unreachable","Payment failed","Duplicate order","Suspected fraud","Other"]$json$::jsonb,
   'Order cancellation reasons'),

  ('config_hsn_codes',
   $json$[{"code":"6214","description":"Shawls, scarves, mufflers (textile)","gstRate":5},{"code":"5208","description":"Cotton woven fabrics","gstRate":5},{"code":"6204","description":"Women's apparel (stitched)","gstRate":12},{"code":"6209","description":"Babies' / kids' garments","gstRate":12},{"code":"7117","description":"Imitation jewellery","gstRate":18}]$json$::jsonb,
   'HSN codes and GST rates'),

  ('config_global_faqs',
   $json$[{"q":"What are Yaawun's shipping timelines?","a":"Orders are processed within 1–2 business days and typically delivered within 3–7 business days across India. Free shipping on orders above ₹999."},{"q":"What is the return and exchange policy?","a":"We offer a 7-day return window from the date of delivery. Items must be unused, unwashed and returned with original packaging. Free return pickup is available across most pincodes."},{"q":"Are the prices inclusive of GST?","a":"Yes, all prices on Yaawun are inclusive of GST. A detailed tax invoice is available in your account once the order is placed."},{"q":"How do I find my size?","a":"Each product page lists fabric cut lengths (for unstitched sets) or finished garment sizes. For ready-to-wear pieces, refer to the size guide linked from the size selector."},{"q":"How should I care for my Yaawun pieces?","a":"Most natural fabric pieces are best dry-cleaned; care instructions are listed on every product page. For embroidered work, avoid moisture, store folded with muslin, and iron on low heat."}]$json$::jsonb,
   'Global FAQs shown on product pages without their own FAQs')
ON CONFLICT (key) DO NOTHING;
