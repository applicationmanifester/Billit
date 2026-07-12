# Billit SaaS Monetization & Scaling Implementation Plan

This document outlines the architectural requirements and technical milestones required to transition Billit from a local-first application into a scalable, monetized SaaS product capable of handling millions of global users.

## 1. Product Requirements & Tiers

The application will operate on a Freemium subscription model defined by three specific tiers.

| Tier | Price | Monthly Invoice Limit | Features |
| :--- | :--- | :--- | :--- |
| **Free (Starter)** | $0/mo | 100 | Basic Invoices, Billit Watermark, Local Primary Storage |
| **Pro** | $9/mo | 500 | Cloud Sync, Remove Watermark, Custom Branding, Unlimited Clients |
| **Ultra (Team)** | $29/mo | Unlimited | Multi-user Access, Advanced Analytics, API Access |

---

## 2. Technical Architecture Strategy

> [!IMPORTANT]
> To save on server costs, **PDF Generation will remain local** using the existing `pdf.js` engine. This is a critical architectural decision that prevents compute costs from mirroring user growth.

### Backend & Database (Firebase / Google Cloud)

- **Database:** Firebase Firestore (scales seamlessly, allows real-time UI updates).
- **Security:** Firebase Security Rules will enforce creation limits at the database level, preventing malicious overrides.
- **Microservices:** Google Cloud Functions will act as the "secure middleman" to handle Stripe Webhooks and complex validation.

### Payment Gateway

- **Provider:** Stripe Checkout for optimized payment UIs and Stripe Billing for recurring subscription management.

### Free & Low-Cost Alternatives

- **Stripe:** (No monthly fee) Standard 2.9% + 30¢. Great for US/Global users.
- **Lemon Squeezy:** (No monthly fee) 5% + 50¢. Handles global taxes and compliance as a Merchant of Record (MoR). Highly recommended for removing tax headaches.
- **Razorpay (India):** (No monthly fee) ~2% for domestic cards. Excellent for regional expansion.
- **UPI/Direct Bank Transfer:** (Truly Free) 0% fee. Best for manual billing and B2B where trust is established.

Recommendation for Billit: Use **Lemon Squeezy** for easiest global launch, or **Stripe** for maximum control and slightly lower fees.

---

## 3. Milestones & Execution Phases

### Phase 1: Database Foundation & Auth

*Target: Establish user tracking and server-side data structure.*

- [x] Ensure all users are strictly authenticated via Firebase Auth.
- [x] Update the Firestore user schema to include billing and usage metrics.
- [x] Implement robust **Lazy Evaluation** in the application data layer to automatically reset `invoicesGenerated` to 0.

### Phase 2: Security & Backend Enforcement (COMPLETE)

- [x] Write Firestore Security Rules to validate creation requests and protect `plan` field.
- [x] Create a Cloud Function structure to handle secure backend tasks.

### Phase 3: Stripe Integration (COMPLETE)

- [x] Implement the Stripe Checkout redirection logic in the React frontend.
- [x] Create a secure Google Cloud Function `createCheckoutSession` to initialize payments.
- [x] Implement the Stripe Webhook listener in Cloud Functions to update plans upon successful payment.
- [x] Integrate Stripe Customer Portal for self-service subscription management.

### Phase 4: Scaling & Automation (COMPLETE)

- [x] **Scheduled Reset**: Transition usage reset logic to a daily CRON job (Firebase Functions).
- [x] **Usage Feedback**: Real-time progress bars in Settings to show user quota consumption.
- [ ] **Audit Logs**: Track plan changes and billing events in a dedicated `billing_history` collection.

---

## 4. Usage Tracker Integration

```javascript
// Example implementation for the Pricing Modal triggering
if (invoicesGenerated >= limit) {
  setShowModal("pricing");
}
```

## 5. Future Roadmap

- **Multi-Currency Billing**: Dynamic conversion rates for international clients.
- **AI Invoice Scanner**: Upload expense receipts to automatically generate draft invoices.
- **Team Access**: Shared business profiles with role-based access control.
