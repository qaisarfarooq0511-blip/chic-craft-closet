-- Migration: 20260801100015_static_pages.sql
-- Purpose: Legal/informational static pages (About, Terms, Privacy Policy,
--          Returns Policy, FAQs) -- previously localStorage-only mock data
--          with no real database table, no server rendering, no SEO.
-- Lane: Full Lane
-- Rollback: DROP TABLE static_pages;

CREATE TABLE static_pages (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT        NOT NULL UNIQUE,
  title             TEXT        NOT NULL,
  content           TEXT        NOT NULL,  -- raw HTML, rendered via dangerouslySetInnerHTML
  meta_title        TEXT,
  meta_description  TEXT,
  is_published      BOOLEAN     NOT NULL DEFAULT false,
  sort_order        INTEGER     NOT NULL DEFAULT 0,
  -- Scale hooks
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE static_pages ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER static_pages_updated_at
  BEFORE UPDATE ON static_pages
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Legal-content edits must be logged, same as product_variants.
CREATE TRIGGER audit_static_pages
  AFTER INSERT OR UPDATE ON static_pages
  FOR EACH ROW EXECUTE FUNCTION log_admin_action();

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Public can read only published, non-deleted pages.
CREATE POLICY "static_pages_select_public"
  ON static_pages FOR SELECT
  TO anon, authenticated
  USING (is_published = true AND deleted_at IS NULL);

-- Admins can read every non-deleted row (including unpublished drafts).
CREATE POLICY "static_pages_select_admin"
  ON static_pages FOR SELECT
  TO authenticated
  USING (is_admin() AND deleted_at IS NULL);

-- Admins can edit content/publish state. No INSERT policy -- the 5 pages are
-- fixed and seeded below; the admin UI never creates a new row. No DELETE
-- policy -- soft delete only, per CLAUDE.md, though nothing in the app ever
-- soft-deletes these fixed rows either.
CREATE POLICY "static_pages_update_admin"
  ON static_pages FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── Seed the 5 fixed pages (content carried over verbatim from src/lib/seed.ts) ──
INSERT INTO static_pages (slug, title, content, is_published, sort_order) VALUES
('about', 'About Us', $about$<p>Yaawun began as a small neighbourhood store curating fabrics, shawls, kidswear and accessories for the women of our community.</p>

<p>Every piece is chosen by hand, photographed by hand and packed by hand. We launched online so the same care could reach women across India.</p>
<h2>Our promise</h2>
<p>Quality fabrics, fair prices and personal service — the way our regulars have known us for years.</p>$about$, true, 0),

('terms', 'Terms of Use', $terms$<p>Welcome to Yaawun. These Terms of Service ("Terms") govern your use of the website www.yaawun.com ("Site") and any purchases made through it. By accessing or using the Site, you agree to be bound by these Terms. If you do not agree, please do not use the Site.</p>

<h2>1. About Us</h2>
<p>Yaawun is a Kashmiri ethnic wear brand operated by Yaawun Textiles. Our registered office and contact details are as follows:</p>
<ul>
<li>Website: www.yaawun.com</li>
<li>Email: <a href="mailto:help@yaawun.com">help@yaawun.com</a></li>
</ul>

<h2>2. Eligibility</h2>
<p>You must be at least 18 years of age to use this Site or make a purchase. If you are under 18, you may only use the Site with the involvement and consent of a parent or legal guardian. By placing an order, you confirm that the information you provide is accurate and complete.</p>

<h2>3. Account Responsibility</h2>
<p>If you create an account on the Site, you are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You agree to notify us immediately of any unauthorised use. Yaawun reserves the right to suspend or terminate accounts that violate these Terms or are used fraudulently.</p>

<h2>4. Products &amp; Descriptions</h2>
<p>We make every effort to display product colours, fabrics, and details as accurately as possible. However, slight variations may occur due to photography, lighting, screen settings, and the handcrafted nature of certain products. Such variations do not constitute a defect and are not grounds for return or exchange. Product availability is subject to change without notice. We reserve the right to limit the quantity of any product and to discontinue any product at any time.</p>

<h2>5. Pricing &amp; Payment</h2>
<p>All prices on the Site are listed in Indian Rupees (INR) and are inclusive of applicable GST unless stated otherwise.</p>
<p>We accept the following payment methods: Credit/Debit Cards (Visa, Mastercard, RuPay), UPI, Net Banking, Mobile Wallets, and Cash on Delivery (COD) where available.</p>
<p>While we take care to ensure pricing accuracy, errors may occur. In the event of a pricing error, we reserve the right to cancel the order and issue a full refund. Yaawun reserves the right to modify prices at any time without prior notice. Prices applicable at the time of order placement will be honoured for that order.</p>

<h2>6. Orders &amp; Confirmation</h2>
<p>Placing an order on the Site constitutes an offer to purchase. Order confirmation via email or SMS is an acknowledgement of your order, not acceptance. Acceptance occurs when the product is dispatched.</p>
<p>We reserve the right to refuse or cancel any order for reasons including but not limited to: product unavailability, pricing errors, suspected fraud, violation of these Terms, or limitations on quantities.</p>

<h2>7. Shipping &amp; Delivery</h2>
<p>We offer shipping across India. Estimated delivery timelines are indicative and may vary depending on your location, courier availability, and unforeseen circumstances.</p>
<p>Risk of loss and title for products pass to you upon delivery. Yaawun is not responsible for delays caused by courier partners, customs, natural disasters, strikes, or other events beyond our reasonable control.</p>
<p>Delivery is subject to pin code serviceability. If your location is unserviceable, we will notify you and process a refund if payment has been made.</p>

<h2>8. Exchange &amp; Return Policy</h2>
<p>We offer a 7-day exchange policy from the date of delivery. Exchanges are processed via store credit, which can be used to purchase any product on the Site.</p>
<p>To be eligible for exchange, items must be unused, unwashed, and in their original condition with all tags attached. Certain products such as innerwear, lingerie, and customised or altered items are not eligible for exchange. Cash refunds are not offered as standard policy. In exceptional circumstances, refunds may be processed at Yaawun's sole discretion. To initiate an exchange, you may use any of the following channels:</p>
<ul>
<li>WhatsApp: +91 99107 84574</li>
<li>Email: <a href="mailto:help@yaawun.com">help@yaawun.com</a></li>
</ul>
<p>For the complete Exchange and Return Policy, please refer to our dedicated policy page.</p>

<h2>9. Promotional Offers &amp; Discount Codes</h2>
<p>Discount codes and promotional offers are subject to specific terms and conditions mentioned at the time of the offer. Unless stated otherwise, offers cannot be combined, are non-transferable, have no cash value, and may be modified or withdrawn at any time. Misuse of promotional codes, including but not limited to multiple account creation, automated use, or sharing codes intended for specific customers, may result in order cancellation and account suspension.</p>

<h2>10. Intellectual Property</h2>
<p>All content on the Site — including but not limited to text, images, photographs, graphics, logos, icons, product designs, and software — is the property of Yaawun Textiles and is protected under applicable intellectual property laws. You may not reproduce, distribute, modify, display, or create derivative works from any content on the Site without our prior written consent. Unauthorised use may result in legal action.</p>

<h2>11. User Conduct</h2>
<p>When using the Site, you agree not to:</p>
<ul>
<li>Provide false or misleading information</li>
<li>Place fraudulent orders or use stolen payment methods</li>
<li>Abuse, threaten, or harass our staff or customer support team</li>
<li>Attempt to gain unauthorised access to any part of the Site</li>
<li>Use automated tools, bots, or scripts to scrape, crawl, or extract data</li>
<li>Interfere with the Site's functionality, security, or performance</li>
<li>Use the Site for any unlawful purpose</li>
</ul>
<p>Violation of these terms may result in immediate account termination and legal action where appropriate.</p>

<h2>12. Privacy</h2>
<p>Your use of the Site is also governed by our Privacy Policy, which describes how we collect, use, store, and protect your personal information. By using the Site, you consent to the practices described in the Privacy Policy.</p>

<h2>13. Third-Party Links &amp; Services</h2>
<p>The Site may contain links to third-party websites, services, or applications. These are provided for convenience only. Yaawun does not endorse, control, or assume responsibility for the content, privacy practices, or policies of any third-party sites. You access them at your own risk.</p>

<h2>14. Limitation of Liability</h2>
<p>To the maximum extent permitted by applicable law, Yaawun and its directors, officers, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Site or purchase of products, including but not limited to loss of profits, data, or goodwill.</p>
<p>Our total liability for any claim arising from these Terms or your use of the Site shall not exceed the amount you paid for the specific product giving rise to the claim.</p>

<h2>15. Indemnification</h2>
<p>You agree to indemnify, defend, and hold harmless Yaawun, its directors, officers, employees, and agents from and against any claims, liabilities, damages, losses, costs, and expenses (including legal fees) arising from your use of the Site, violation of these Terms, or infringement of any rights of a third party.</p>

<h2>16. Force Majeure</h2>
<p>Yaawun shall not be liable for any failure or delay in performing its obligations where such failure or delay results from circumstances beyond its reasonable control, including but not limited to natural disasters, pandemics, government actions, war, civil unrest, strikes, power failures, or internet disruptions.</p>

<h2>17. Modifications to These Terms</h2>
<p>We reserve the right to update or modify these Terms at any time without prior notice. Changes will be effective immediately upon posting on the Site. Your continued use of the Site after any changes constitutes your acceptance of the revised Terms. We encourage you to review these Terms periodically.</p>

<h2>18. Severability</h2>
<p>If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect.</p>

<h2>19. Governing Law &amp; Jurisdiction</h2>
<p>These Terms are governed by and construed in accordance with the laws of India. Any disputes arising from these Terms or your use of the Site shall be subject to the exclusive jurisdiction of the courts in Srinagar, J &amp; K, India.</p>

<h2>20. Grievance Officer</h2>
<p>In accordance with the Information Technology Act, 2000 and the Consumer Protection (E-Commerce) Rules, 2020, the details of the Grievance Officer are as follows:</p>
<ul>
<li>Email: <a href="mailto:help@yaawun.com">help@yaawun.com</a></li>
<li>Response time: Within 5 business days</li>
</ul>

<h2>21. Contact Us</h2>
<p>If you have any questions or concerns about these Terms, please contact us:</p>
<p>Email: <a href="mailto:help@yaawun.com">help@yaawun.com</a></p>$terms$, true, 1),

('privacy-policy', 'Privacy Policy', $privacy$<p><strong>Yaawun Fashions</strong> ("Yaawun", "we", "us", or "our") operates the website www.yaawun.com ("Site"). This Privacy Policy explains how we collect, use, store, share, and protect your personal information when you visit our Site, use our services, or make a purchase.</p>
<p>By using the Site, you consent to the practices described in this Privacy Policy. If you do not agree, please do not use the Site.</p>

<h2>1. Who We Are</h2>
<ul>
<li>Company Name: Yaawun Fashions</li>
<li>Website: www.yaawun.com</li>
<li>Email: <a href="mailto:help@yaawun.com">help@yaawun.com</a></li>
<li>WhatsApp: +91 99107 84574</li>
</ul>

<h2>2. Information We Collect</h2>

<h3>2.1 Information You Provide</h3>
<p>When you register, place an order, or interact with us, we may collect:</p>
<ul>
<li>Full name</li>
<li>Phone number</li>
<li>Shipping and billing address</li>
<li>Payment information (processed securely via third-party payment gateways — we do not store your card details)</li>
<li>Order history and preferences</li>
<li>Communications you send to us (emails, chat messages, reviews, feedback)</li>
</ul>

<h3>2.2 Information Collected Automatically</h3>
<p>When you browse the Site, we may automatically collect:</p>
<ul>
<li>IP address</li>
<li>Device type, browser type, and operating system</li>
<li>Pages visited, time spent, and navigation path</li>
<li>Referring website or link that brought you to our Site</li>
<li>Location data (approximate, based on IP address)</li>
</ul>

<h3>2.3 Cookies and Tracking Technologies</h3>
<p>We use cookies and similar technologies to:</p>
<ul>
<li>Keep your shopping cart active across sessions</li>
<li>Remember your preferences and login details</li>
<li>Analyse site traffic and user behaviour</li>
<li>Deliver relevant advertisements and offers</li>
</ul>
<p>You can manage cookie preferences through your browser settings. Disabling cookies may affect some features of the Site.</p>

<h2>3. How We Use Your Information</h2>
<p>We use your personal information for the following purposes:</p>
<ul>
<li>To process and fulfil your orders, including shipping and delivery</li>
<li>To communicate with you about your orders, account, and enquiries</li>
<li>To send promotional emails, SMS, and WhatsApp messages about offers, new arrivals, and updates (you can opt out at any time)</li>
<li>To personalise your shopping experience and recommend products</li>
<li>To improve our Site, services, and product offerings</li>
<li>To detect and prevent fraud, abuse, and security threats</li>
<li>To comply with legal obligations and resolve disputes</li>
<li>To conduct internal analytics and business research</li>
</ul>

<h2>4. How We Share Your Information</h2>
<p>We do <strong>not</strong> sell or rent your personal information to third parties for their marketing purposes.</p>
<p>We may share your information with:</p>
<ul>
<li><strong>Service Providers:</strong> Courier and logistics partners, payment gateways, SMS/email service providers, cloud hosting providers, and analytics tools — strictly on a need-to-know basis and only to fulfil our services to you.</li>
<li><strong>Legal Authorities:</strong> When required by law, court order, or government request, or when we believe disclosure is necessary to protect our rights, your safety, or the safety of others.</li>
<li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the business. We will notify you of any such change.</li>
</ul>

<h2>5. Data Security</h2>
<p>We implement industry-standard security measures to protect your personal information, including:</p>
<ul>
<li>SSL encryption for all data transmission</li>
<li>Secure payment processing through PCI-DSS compliant payment gateways</li>
<li>Access controls limiting employee access to personal data on a need-to-know basis</li>
<li>Regular security audits and monitoring</li>
</ul>
<p>While we take every reasonable precaution, no method of internet transmission or electronic storage is completely secure. We cannot guarantee absolute security of your data.</p>

<h2>6. Data Retention</h2>
<p>We retain your personal information for as long as necessary to:</p>
<ul>
<li>Fulfil the purposes described in this Privacy Policy</li>
<li>Comply with legal and regulatory requirements</li>
<li>Resolve disputes and enforce our agreements</li>
</ul>
<p>If you request deletion of your account, we will remove your personal data within a reasonable timeframe, except where retention is required by law (e.g., tax and accounting records).</p>

<h2>7. Your Rights</h2>
<p>Under applicable Indian law, including the Digital Personal Data Protection Act, 2023 (DPDPA), you have the right to:</p>
<ul>
<li><strong>Access:</strong> Request a summary of the personal data we hold about you.</li>
<li><strong>Correction:</strong> Request correction of inaccurate or incomplete personal data.</li>
<li><strong>Erasure:</strong> Request deletion of your personal data, subject to legal obligations.</li>
<li><strong>Withdraw Consent:</strong> Withdraw your consent for data processing at any time. This will not affect the lawfulness of processing carried out before withdrawal.</li>
<li><strong>Grievance Redressal:</strong> Lodge a complaint with us or the relevant Data Protection Board if you believe your rights have been violated.</li>
<li><strong>Opt Out of Marketing:</strong> Unsubscribe from promotional communications at any time by clicking the unsubscribe link in our emails or contacting us.</li>
</ul>
<p>To exercise any of these rights, please contact us at <a href="mailto:help@yaawun.com">help@yaawun.com</a>.</p>

<h2>8. Children's Privacy</h2>
<p>The Site is not intended for use by individuals under the age of 18 without parental or guardian consent. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal data, please contact us and we will take steps to delete such information.</p>

<h2>9. Third-Party Links</h2>
<p>Our Site may contain links to third-party websites, social media platforms, and services. This Privacy Policy applies only to our Site. We are not responsible for the privacy practices of third-party sites. We encourage you to read the privacy policies of any third-party site you visit.</p>

<h2>10. Cookies Policy</h2>
<table>
<tr><th>Cookie Type</th><th>Purpose</th><th>Duration</th></tr>
<tr><td>Essential</td><td>Site functionality, shopping cart, login sessions</td><td>Session / 30 days</td></tr>
<tr><td>Analytics</td><td>Understanding site usage and improving performance</td><td>Up to 2 years</td></tr>
<tr><td>Marketing</td><td>Delivering relevant ads and measuring campaign effectiveness</td><td>Up to 1 year</td></tr>
<tr><td>Preference</td><td>Remembering your settings and preferences</td><td>Up to 1 year</td></tr>
</table>
<p>You can control cookies through your browser settings. Note that blocking essential cookies may prevent you from using certain features of the Site.</p>

<h2>11. Changes to This Privacy Policy</h2>
<p>We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. Any changes will be posted on this page with an updated "Last updated" date. Your continued use of the Site after changes are posted constitutes your acceptance of the revised Privacy Policy.</p>
<p>We encourage you to review this Privacy Policy periodically.</p>

<h2>12. Grievance Officer</h2>
<p>In accordance with the Information Technology Act, 2000, the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and the Digital Personal Data Protection Act, 2023, the details of our Grievance Officer are:</p>
<ul>
<li>Email: <a href="mailto:help@yaawun.com">help@yaawun.com</a></li>
<li>Response Time: Within 5 business days</li>
<li>Resolution Time: Within 30 days of receiving the complaint</li>
</ul>

<h2>13. Contact Us</h2>
<p>If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:</p>
<ul>
<li>Email: <a href="mailto:help@yaawun.com">help@yaawun.com</a></li>
<li>WhatsApp: +91 99107 84574</li>
<li>Website: <a href="https://www.yaawun.com">www.yaawun.com</a></li>
</ul>$privacy$, true, 2),

('returns-policy', 'Returns, Refunds & Cancellation', $returns$<p>We believe in satisfying and delighting our customers with the best possible products at the best value. To maintain an efficient and transparent process for our community, <strong>Yaawun operates on an Exchange-Only policy.</strong> We do not offer returns or standard refunds.</p>
<p>Under specific circumstances outlined below, we are happy to facilitate an exchange to ensure you get the perfect item.</p>

<h2>1. Damaged, Defective, or Wrong Items Delivered</h2>
<p>At Yaawun, every product undergoes a strict quality check before shipping. However, if a manual error occurs and you receive a product that is damaged, defective, or incorrect:</p>
<p><strong>What to do:</strong> Please email us at <a href="mailto:help@yaawun.com">help@yaawun.com</a> within <strong>7 days of delivery</strong> with your order number and a few clear pictures of the issue.</p>
<p><strong>Our Resolution:</strong> We will promptly arrange for a replacement of the exact same item.</p>
<p><strong>Discretionary Refunds:</strong> In rare cases where the relevant replacement item is out of stock or completely unavailable, Yaawun may, at its sole discretion, issue a refund or store credit.</p>

<h2>2. Sizing Issues</h2>
<p>If your item does not fit perfectly, we are happy to help you exchange it for a different size of the same style.</p>
<p><strong>What to do:</strong> Email us at <a href="mailto:help@yaawun.com">help@yaawun.com</a> within <strong>7 days of delivery</strong> with your order number and the size you need.</p>
<p><strong>The Process:</strong> We will provide a return packing slip and arrange a pickup within 48–72 hours.</p>
<p><strong>Note:</strong> If reverse pickup is unavailable at your pincode, we kindly ask you to ship the package back to us, and we will reimburse up to INR 100/- for courier charges.</p>
<p><strong>Resolution:</strong> Once the original item is received and inspected at our warehouse, your replacement size will be shipped out to you.</p>

<h2>3. Clearance &amp; Sale Items</h2>
<p>Items sold under a "Clearance Sale" or marked at a reduced promotional price are considered <strong>Final Sale</strong>. These items are <strong>not eligible for exchanges, replacements, or resizing</strong> under any circumstances.</p>

<h2>4. Beads and Sequins Policy</h2>
<p>We hope our customers understand that garments featuring intricate beadwork and sequins have a natural tendency to shift or come off. This can happen during shipping despite our best efforts. Most minor shifts can be easily adjusted during stitching or by a local tailor. Because a replacement item will carry the same delicate characteristics, <strong>we do not offer exchanges for minor bead or sequin displacement</strong>. We kindly ask that you consult your tailor before requesting an exchange.</p>$returns$, true, 3),

('faqs', 'FAQ''s', $faqs$<h2>How do I place an order?</h2>
<p>Add items to your bag and complete checkout. You'll receive a WhatsApp confirmation from our team.</p>
<h2>Do you offer Cash on Delivery?</h2>
<p>Yes, COD is available across most of India.</p>
<h2>How long does delivery take?</h2>
<p>Typically 4–7 working days depending on your location.</p>
<h2>Can I exchange a size?</h2>
<p>Yes — please contact us within 7 days of delivery and we'll help arrange an exchange where possible.</p>$faqs$, true, 4);
