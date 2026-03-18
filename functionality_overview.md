# Billit - Detailed Functionality Document

Billit is a high-performance, professional billing and invoice management application designed for modern businesses. It combines a fast, local-first user experience with secure cloud synchronization.

---

## 1. Dashboard & Financial Analytics

The Dashboard provides an immediate financial health check for your business.

- **KPI Cards**: Glanceable metrics for **Total Revenue**, **Pending Payments**, **Overdue Invoices**, and **Drafts**.
- **Monthly Trend Indicator**: Real-time comparison of current month's revenue vs. previous month for growth tracking.
- **Financial Board**: An expanded statistics section showing:
  - **Total Pre-tax Amount**: The core revenue before taxes.
  - **Taxes Collected**: Aggregated tax amounts based on your set rates.
  - **Grand Total**: The final amount including all taxes.
- **Recent Activity**: A list of the latest invoices with status indicators for quick tracking.

## 2. Professional Invoice Management

The core engine of Billit simplifies the entire lifecycle of an invoice.

- **Smart Invoice Builder**:
  - **Async Save Flow**: Ensuring all data is safely written before moving to the next action.
  - **Auto-Formatting**: Automatic generation of invoice IDs (e.g., INV-001) with customizable prefixes.
  - **Dynamic Line Items**: Add products or services with automatic calculation of sub-totals and tax amounts.
  - **Quick Entry**: Global keyboard shortcuts for creating new invoices, closing modals, and navigating tabs.
- **Document Output**:
  - **Premium PDFs**: High-fidelity, branded PDF generation directly in the browser.
  - **Non-ASCII Support**: Advanced canvas-based rendering for business names with special characters or symbols.
  - **Native Actions**: Integrated **Download**, **Print**, and **Share** (via Native Share API or Clipboard).
  - **Thermal Receipts**: Optimized 80mm/58mm format for thermal printers.
- **Batch Management**:
  - **Selection Mode**: Select multiple invoices to perform bulk actions.
  - **Bundle Export**: Download or Print multiple invoices combined into a single PDF bundle.

## 3. Client & Inventory Modules

Streamline your workflow by managing recurring data with built-in safety checks.

- **Client Manager**:
  - Store client contact details and addresses.
  - View total lifetime billing per client.
- **Inventory Manager**:
  - Maintain a catalog of products and services.
  - **Usage Tracking**: Intelligent checks to see which items are used in existing invoices before deletion.
  - Support for product images (with automatic client-side compression).
  - Pre-define prices and tax rates for quick insertion into invoices.

## 4. Financial Reporting

Go beyond simple billing with specialized financial views.

- **Taxes Collected Report**: Breakdown of taxes gathered across different tax brackets.
- **Revenue Distribution**: Insights into which months and clients are driving the most revenue.

## 5. Customization & Business Identity

Make the application truly yours through extensive settings.

- **Business Profile**: Upload your **Logo** and **Payment QR Code** to be automatically included in all professional documents.
- **Sticky Actions**: Optimized modals with sticky headers for quick saving on mobile devices.
- **Regional Preferences**:
  - **Global Currency Support**: Select your preferred currency with accurate symbol formatting.
  - **Tax Configuration**: Set default tax rates (e.g., GST 18%) with dependency tracking (warning when deleting taxes used in drafts).
- **Visual Themes**: Premium **Dark** and **Light** modes with the ability to sync with system preferences.

## 6. Data Sovereignty & Security

- **Local-First Performance**: Uses Browser **LocalStorage** for near-instant interaction and offline availability.
- **Secure Cloud Sync**: Optional **Google Firebase** integration for secure, automated backups and cross-device synchronization.
  - **Storage Optimization**: Large assets like logos are stored locally to prevent cloud document size limits (1MB).
- **Privacy-Centric**: All financial calculations and PDF generation are performed **locally** on your device. Your sensitive business data remains yours.
- **Safety Safeguards**: Prevention of redundant cloud writes on app load and robust "Danger Zone" protections.
