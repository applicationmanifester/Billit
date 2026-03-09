import React, { useState, useMemo } from "react";

const initialClients = [
  { id: 1, name: "Customer", email: "customer@company.com", phone: "+1 000-000", address: "xyz" },
];

const initialInvoices = [];

const statusColors = {
  paid: { bg: "#0d2818", text: "#4ade80", border: "#166534" },
  sent: { bg: "#1e1b4b", text: "#818cf8", border: "#3730a3" },
  draft: { bg: "#1c1917", text: "#a8a29e", border: "#44403c" },
  overdue: { bg: "#2d0a0a", text: "#f87171", border: "#7f1d1d" },
};

const total = (items) => items.reduce((s, i) => s + i.qty * i.price, 0);
const itemTax = (item) => item.qty * item.price * ((item.tax || 0) / 100);
const totalWithTax = (items) => items.reduce((s, i) => s + i.qty * i.price + itemTax(i), 0);

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE" },
  { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
  { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", locale: "zh-CN" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", locale: "en-CA" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc", locale: "de-CH" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", locale: "en-SG" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", locale: "zh-HK" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", locale: "en-NZ" },
  { code: "KRW", symbol: "₩", name: "South Korean Won", locale: "ko-KR" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", locale: "pt-BR" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso", locale: "es-MX" },
  { code: "ZAR", symbol: "R", name: "South African Rand", locale: "en-ZA" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", locale: "ar-AE" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal", locale: "ar-SA" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira", locale: "tr-TR" },
  { code: "RUB", symbol: "₽", name: "Russian Ruble", locale: "ru-RU" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", locale: "id-ID" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", locale: "ms-MY" },
  { code: "THB", symbol: "฿", name: "Thai Baht", locale: "th-TH" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso", locale: "en-PH" },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong", locale: "vi-VN" },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee", locale: "ur-PK" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka", locale: "bn-BD" },
  { code: "EGP", symbol: "£", name: "Egyptian Pound", locale: "ar-EG" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira", locale: "en-NG" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling", locale: "sw-KE" },
  { code: "GHS", symbol: "₵", name: "Ghanaian Cedi", locale: "en-GH" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona", locale: "sv-SE" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone", locale: "nb-NO" },
  { code: "DKK", symbol: "kr", name: "Danish Krone", locale: "da-DK" },
  { code: "PLN", symbol: "zł", name: "Polish Zloty", locale: "pl-PL" },
  { code: "CZK", symbol: "Kč", name: "Czech Koruna", locale: "cs-CZ" },
  { code: "HUF", symbol: "Ft", name: "Hungarian Forint", locale: "hu-HU" },
  { code: "RON", symbol: "lei", name: "Romanian Leu", locale: "ro-RO" },
  { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia", locale: "uk-UA" },
  { code: "ILS", symbol: "₪", name: "Israeli Shekel", locale: "he-IL" },
  { code: "QAR", symbol: "﷼", name: "Qatari Riyal", locale: "ar-QA" },
  { code: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar", locale: "ar-KW" },
  { code: "BHD", symbol: "BD", name: "Bahraini Dinar", locale: "ar-BH" },
  { code: "OMR", symbol: "﷼", name: "Omani Rial", locale: "ar-OM" },
  { code: "JOD", symbol: "JD", name: "Jordanian Dinar", locale: "ar-JO" },
  { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee", locale: "si-LK" },
  { code: "NPR", symbol: "Rs", name: "Nepalese Rupee", locale: "ne-NP" },
  { code: "MMK", symbol: "K", name: "Myanmar Kyat", locale: "my-MM" },
  { code: "TWD", symbol: "NT$", name: "Taiwan Dollar", locale: "zh-TW" },
  { code: "CLP", symbol: "$", name: "Chilean Peso", locale: "es-CL" },
  { code: "COP", symbol: "$", name: "Colombian Peso", locale: "es-CO" },
  { code: "ARS", symbol: "$", name: "Argentine Peso", locale: "es-AR" },
  { code: "PEN", symbol: "S/", name: "Peruvian Sol", locale: "es-PE" },
  { code: "MAD", symbol: "MAD", name: "Moroccan Dirham", locale: "ar-MA" },
  { code: "DZD", symbol: "DA", name: "Algerian Dinar", locale: "ar-DZ" },
  { code: "TND", symbol: "DT", name: "Tunisian Dinar", locale: "ar-TN" },
  { code: "XOF", symbol: "CFA", name: "West African CFA", locale: "fr-SN" },
  { code: "ETB", symbol: "Br", name: "Ethiopian Birr", locale: "am-ET" },
  { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling", locale: "sw-TZ" },
  { code: "UGX", symbol: "USh", name: "Ugandan Shilling", locale: "sw-UG" },
  { code: "ZMW", symbol: "ZK", name: "Zambian Kwacha", locale: "en-ZM" },
  { code: "BWP", symbol: "P", name: "Botswana Pula", locale: "en-BW" },
  { code: "MUR", symbol: "Rs", name: "Mauritian Rupee", locale: "en-MU" },
  { code: "HRK", symbol: "kn", name: "Croatian Kuna", locale: "hr-HR" },
  { code: "BGN", symbol: "лв", name: "Bulgarian Lev", locale: "bg-BG" },
  { code: "ISK", symbol: "kr", name: "Icelandic Krona", locale: "is-IS" },
  { code: "HNL", symbol: "L", name: "Honduran Lempira", locale: "es-HN" },
  { code: "GTQ", symbol: "Q", name: "Guatemalan Quetzal", locale: "es-GT" },
  { code: "CRC", symbol: "₡", name: "Costa Rican Colón", locale: "es-CR" },
  { code: "DOP", symbol: "RD$", name: "Dominican Peso", locale: "es-DO" },
  { code: "JMD", symbol: "J$", name: "Jamaican Dollar", locale: "en-JM" },
  { code: "TTD", symbol: "TT$", name: "Trinidad Dollar", locale: "en-TT" },
  { code: "BBD", symbol: "Bds$", name: "Barbadian Dollar", locale: "en-BB" },
  { code: "GYD", symbol: "GY$", name: "Guyanese Dollar", locale: "en-GY" },
  { code: "BZD", symbol: "BZ$", name: "Belize Dollar", locale: "en-BZ" },
  { code: "SRD", symbol: "$", name: "Surinamese Dollar", locale: "nl-SR" },
  { code: "BOB", symbol: "Bs.", name: "Bolivian Boliviano", locale: "es-BO" },
  { code: "UYU", symbol: "$U", name: "Uruguayan Peso", locale: "es-UY" },
  { code: "PYG", symbol: "Gs", name: "Paraguayan Guaraní", locale: "es-PY" },
  { code: "VES", symbol: "Bs.S", name: "Venezuelan Bolívar", locale: "es-VE" },
  { code: "ECU", symbol: "$", name: "Ecuadorian (USD)", locale: "es-EC" },
  { code: "NIO", symbol: "C$", name: "Nicaraguan Córdoba", locale: "es-NI" },
  { code: "HRK", symbol: "kn", name: "Croatian Kuna", locale: "hr-HR" },
  { code: "MKD", symbol: "ден", name: "Macedonian Denar", locale: "mk-MK" },
  { code: "RSD", symbol: "din", name: "Serbian Dinar", locale: "sr-RS" },
  { code: "BAM", symbol: "KM", name: "Bosnian Mark", locale: "bs-BA" },
  { code: "ALL", symbol: "L", name: "Albanian Lek", locale: "sq-AL" },
  { code: "MDL", symbol: "L", name: "Moldovan Leu", locale: "ro-MD" },
  { code: "GEL", symbol: "₾", name: "Georgian Lari", locale: "ka-GE" },
  { code: "AMD", symbol: "֏", name: "Armenian Dram", locale: "hy-AM" },
  { code: "AZN", symbol: "₼", name: "Azerbaijani Manat", locale: "az-AZ" },
  { code: "KZT", symbol: "₸", name: "Kazakhstani Tenge", locale: "kk-KZ" },
  { code: "UZS", symbol: "so'm", name: "Uzbekistani Som", locale: "uz-UZ" },
  { code: "TMT", symbol: "T", name: "Turkmenistani Manat", locale: "tk-TM" },
  { code: "AFN", symbol: "؋", name: "Afghan Afghani", locale: "fa-AF" },
  { code: "IRR", symbol: "﷼", name: "Iranian Rial", locale: "fa-IR" },
  { code: "IQD", symbol: "ع.د", name: "Iraqi Dinar", locale: "ar-IQ" },
  { code: "SYP", symbol: "£", name: "Syrian Pound", locale: "ar-SY" },
  { code: "LBP", symbol: "ل.ل", name: "Lebanese Pound", locale: "ar-LB" },
  { code: "YER", symbol: "﷼", name: "Yemeni Rial", locale: "ar-YE" },
  { code: "SDG", symbol: "ج.س", name: "Sudanese Pound", locale: "ar-SD" },
  { code: "ETB", symbol: "Br", name: "Ethiopian Birr", locale: "am-ET" },
  { code: "MZN", symbol: "MT", name: "Mozambican Metical", locale: "pt-MZ" },
  { code: "AOA", symbol: "Kz", name: "Angolan Kwanza", locale: "pt-AO" },
  { code: "CDF", symbol: "FC", name: "Congolese Franc", locale: "fr-CD" },
  { code: "RWF", symbol: "RF", name: "Rwandan Franc", locale: "rw-RW" },
  { code: "SOS", symbol: "Sh", name: "Somali Shilling", locale: "so-SO" },
  { code: "MGA", symbol: "Ar", name: "Malagasy Ariary", locale: "mg-MG" },
  { code: "XAF", symbol: "FCFA", name: "Central African CFA", locale: "fr-CM" },
  { code: "LSL", symbol: "L", name: "Lesotho Loti", locale: "st-LS" },
  { code: "NAD", symbol: "N$", name: "Namibian Dollar", locale: "en-NA" },
  { code: "SZL", symbol: "L", name: "Swazi Lilangeni", locale: "en-SZ" },
  { code: "MWK", symbol: "MK", name: "Malawian Kwacha", locale: "en-MW" },
  { code: "GMD", symbol: "D", name: "Gambian Dalasi", locale: "en-GM" },
  { code: "SLL", symbol: "Le", name: "Sierra Leonean Leone", locale: "en-SL" },
  { code: "GNF", symbol: "FG", name: "Guinean Franc", locale: "fr-GN" },
  { code: "LRD", symbol: "L$", name: "Liberian Dollar", locale: "en-LR" },
  { code: "MOP", symbol: "P", name: "Macanese Pataca", locale: "zh-MO" },
  { code: "KHR", symbol: "៛", name: "Cambodian Riel", locale: "km-KH" },
  { code: "LAK", symbol: "₭", name: "Lao Kip", locale: "lo-LA" },
  { code: "MNT", symbol: "₮", name: "Mongolian Tögrög", locale: "mn-MN" },
  { code: "BTN", symbol: "Nu", name: "Bhutanese Ngultrum", locale: "dz-BT" },
  { code: "MVR", symbol: "Rf", name: "Maldivian Rufiyaa", locale: "dv-MV" },
  { code: "PGK", symbol: "K", name: "Papua New Guinean Kina", locale: "en-PG" },
  { code: "FJD", symbol: "FJ$", name: "Fijian Dollar", locale: "en-FJ" },
  { code: "WST", symbol: "WS$", name: "Samoan Tala", locale: "sm-WS" },
  { code: "TOP", symbol: "T$", name: "Tongan Paʻanga", locale: "to-TO" },
  { code: "VUV", symbol: "VT", name: "Vanuatu Vatu", locale: "bi-VU" },
  { code: "SBD", symbol: "SI$", name: "Solomon Islands Dollar", locale: "en-SB" },
  { code: "KYD", symbol: "CI$", name: "Cayman Islands Dollar", locale: "en-KY" },
  { code: "AWG", symbol: "Afl", name: "Aruban Florin", locale: "nl-AW" },
  { code: "ANG", symbol: "NAf", name: "Netherlands Antillean Guilder", locale: "nl-SX" },
  { code: "BMD", symbol: "BD$", name: "Bermudian Dollar", locale: "en-BM" },
  { code: "BSD", symbol: "B$", name: "Bahamian Dollar", locale: "en-BS" },
  { code: "HTG", symbol: "G", name: "Haitian Gourde", locale: "ht-HT" },
  { code: "CUP", symbol: "$MN", name: "Cuban Peso", locale: "es-CU" },
  { code: "PAB", symbol: "B/.", name: "Panamanian Balboa", locale: "es-PA" },
  { code: "SVC", symbol: "₡", name: "Salvadoran Colón", locale: "es-SV" },
];

export default function BillingApp() {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [clients, setClients] = useState(initialClients);
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showModal, setShowModal] = useState(null); // 'invoice' | 'client' | 'view'
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedInvoices, setSelectedInvoices] = useState([]); // multi-select for bulk download
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkConfirmDelete, setBulkConfirmDelete] = useState(false);
  const [shareData, setShareData] = useState(null); // { text, invId }
  const [selectedClient, setSelectedClient] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // clientId to delete
  const [toast, setToast] = useState(null);
  const [currency, setCurrency] = useState(CURRENCIES[0]); // USD default
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");
  const [taxRates, setTaxRates] = useState([
    { id: 1, name: "GST", rate: 18 },
  ]);
  const defaultTax = taxRates.reduce((s, t) => s + t.rate, 0);
  const addTaxRate = () => setTaxRates(prev => [...prev, { id: Date.now(), name: "Tax " + (prev.length + 1), rate: 0 }]);
  const updateTaxRate = (id, field, val) => setTaxRates(prev => prev.map(t => t.id === id ? { ...t, [field]: field === "rate" ? Math.min(100, Math.max(0, +val)) : val } : t));
  const removeTaxRate = (id) => setTaxRates(prev => prev.length > 1 ? prev.filter(t => t.id !== id) : prev);
  const [seller, setSeller] = useState({
    name: "Your Business Name",
    tagline: "Professional Billing",
    email: "seller@business.com",
    phone: "+1 000-000-0000",
    address: "123 Business St, City, State",
    gstin: "",
    website: "",
  });
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [sellerForm, setSellerForm] = useState(null);
  const [products, setProducts] = useState([]);
  const [productForm, setProductForm] = useState({ name: "", price: "" });
  const [editingProductId, setEditingProductId] = useState(null);
  const [openItemPicker, setOpenItemPicker] = useState(null); // idx of open picker
  const [menuShareData, setMenuShareData] = useState(null);
  const [inventoryTitle, setInventoryTitle] = useState("Products & Services");
  const [editingInventoryTitle, setEditingInventoryTitle] = useState(false);

  const [theme, setTheme] = useState("dark"); // 'dark' | 'light' | 'system'
  const [feedback, setFeedback] = useState({ name: "", email: "", message: "", link: "", attachments: [] });
  const [feedbackSent, setFeedbackSent] = useState(false);

  const systemDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && systemDark);

  const T = {
    bg: isDark ? "#0a0a0f" : "#f4f3f0",
    headerBg: isDark ? "linear-gradient(135deg,#0f0f1a 0%,#1a1025 100%)" : "linear-gradient(135deg,#ffffff 0%,#f0eee8 100%)",
    headerBorder: isDark ? "#2a2535" : "#ddd9d0",
    cardBg: isDark ? "#12111c" : "#ffffff",
    cardBorder: isDark ? "#2a2535" : "#e5e2da",
    inputBg: isDark ? "#1a1825" : "#f9f8f5",
    inputBorder: isDark ? "#2a2535" : "#d8d4ca",
    navBg: isDark ? "#0f0f1a" : "#ffffff",
    navBorder: isDark ? "#2a2535" : "#e0dcd4",
    text: isDark ? "#e8e3d9" : "#1a1a1a",
    textSub: isDark ? "#9e9aad" : "#6b6370",
    textMute: isDark ? "#6b6580" : "#aaa8a0",
    modalBg: isDark ? "#12111c" : "#ffffff",
    divider: isDark ? "#2a2535" : "#e5e2da",
    handle: isDark ? "#2a2535" : "#ccc9c0",
    logo: "#f5c842",
  };
  const fmt = (n) => { try { return new Intl.NumberFormat(currency.locale, { style: "currency", currency: currency.code }).format(n); } catch (e) { return currency.symbol + n.toFixed(2); } };

  const [form, setForm] = useState({
    clientId: String(initialClients[0].id), date: new Date().toISOString().split("T")[0],
    due: new Date().toISOString().split("T")[0], status: "sent", items: [{ desc: "", qty: 1, price: 0, tax: defaultTax }], notes: ""
  });
  const [clientForm, setClientForm] = useState({ name: "", email: "", phone: "", address: "", info: "" });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const stats = useMemo(() => {
    const paid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + totalWithTax(i.items), 0);
    const pending = invoices.filter(i => i.status === "sent").reduce((s, i) => s + totalWithTax(i.items), 0);
    const overdue = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + totalWithTax(i.items), 0);
    const totalTax = invoices.filter(i => i.status !== "draft").reduce((s, i) => s + i.items.reduce((sum, item) => sum + itemTax(item), 0), 0);
    const totalPretax = invoices.filter(i => i.status !== "draft").reduce((s, i) => s + total(i.items), 0);
    const draft = invoices.filter(i => i.status === "draft").length;
    const totalAmount = totalPretax + totalTax;
    return { paid, pending, overdue, draft, totalTax, totalPretax, totalAmount, total: (paid + pending + overdue) || 0 };
  }, [invoices]);

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const client = clients.find(c => c.id === inv.clientId);
      const matchSearch = !search || inv.id.toLowerCase().includes(search.toLowerCase()) ||
        (client && client.name.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = filterStatus === "all" || inv.status === filterStatus;
      return matchSearch && matchStatus;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [invoices, clients, search, filterStatus]);

  const getClient = (id) => clients.find(c => c.id === id);

  const addInvoiceItem = () => setForm(f => ({ ...f, items: [...f.items, { desc: "", qty: 1, price: 0, tax: defaultTax }] }));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx, field, val) => setForm(f => ({
    ...f, items: f.items.map((item, i) => i === idx ? { ...item, [field]: field === "desc" ? val : +val } : item)
  }));

  const saveInvoice = () => {
    if (!form.clientId || !form.due) return showToast("Please fill all required fields", "error");
    const newId = `INV-${String(invoices.length + 1).padStart(3, "0")}`;
    setInvoices(prev => [...prev, { ...form, id: newId, clientId: +form.clientId }]);
    setShowModal(null);
    setForm({ clientId: String(initialClients[0].id), date: new Date().toISOString().split("T")[0], due: new Date().toISOString().split("T")[0], status: "sent", items: [{ desc: "", qty: 1, price: 0, tax: defaultTax }], notes: "" });
    showToast("Invoice created successfully!");
  };

  const saveClient = () => {
    if (!clientForm.name) return showToast("Client name is required", "error");
    if (selectedClient) {
      // Edit mode
      setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, ...clientForm } : c));
      showToast("Client updated successfully!");
    } else {
      // Add mode
      setClients(prev => [...prev, { ...clientForm, id: Date.now() }]);
      showToast("Client added successfully!");
    }
    setShowModal(null);
    setSelectedClient(null);
    setClientForm({ name: "", email: "", phone: "", address: "", info: "" });
  };

  const deleteClient = (id) => {
    setClients(prev => prev.filter(c => c.id !== id));
    setInvoices(prev => prev.filter(inv => inv.clientId !== id));
    setConfirmDelete(null);
    setShowModal(null);
    showToast("Client and their invoices deleted");
  };

  const openEditClient = (c) => {
    setSelectedClient(c);
    setClientForm({ name: c.name, email: c.email, phone: c.phone, address: c.address, info: c.info || "" });
    setShowModal("client");
  };

  const openAddClient = () => {
    setSelectedClient(null);
    setClientForm({ name: "", email: "", phone: "", address: "", info: "" });
    setShowModal("client");
  };

  const updateStatus = (id, status) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
    showToast(`Invoice marked as ${status}`);
  };

  const deleteInvoice = (id) => {
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    setShowModal(null);
    showToast("Invoice deleted");
  };

  const [printData, setPrintData] = useState(null);

  const downloadBulkPdf = (selInvs) => {
    const W = 595, H = 842;
    const esc = s => String(s || "").replace(/[()\\]/g, c => "\\" + c);
    const gold = [0.961, 0.784, 0.259], dark = [0.059, 0.059, 0.098], light = [0.91, 0.89, 0.85], muted = [0.62, 0.60, 0.68];
    // Build page content streams first, collect them
    const pageStreams = selInvs.map(inv => {
      const client = clients.find(c => c.id === inv.clientId);
      const sub = total(inv.items);
      const taxAmt = inv.items.reduce((s, i) => s + itemTax(i), 0);
      const grand = sub + taxAmt;
      const rg = ([r, g, b]) => r.toFixed(3) + " " + g.toFixed(3) + " " + b.toFixed(3) + " rg\n";
      const RG = ([r, g, b]) => r.toFixed(3) + " " + g.toFixed(3) + " " + b.toFixed(3) + " RG\n";
      const fr = (x, y, w, h, col) => rg(col) + x + " " + y + " " + w + " " + h + " re f\n";
      const tx = (text, x, y, sz, col, bold) => "BT /" + (bold ? "Fb" : "Fr") + " " + sz + " Tf " + rg(col) + x.toFixed(1) + " " + y.toFixed(1) + " Td (" + esc(text) + ") Tj ET\n";
      const hl = (x1, y1, x2, col, lw) => RG(col) + (lw || 0.5) + " w " + x1 + " " + y1 + " m " + x2 + " " + y1 + " l S\n";
      let cs = "";
      cs += fr(0, H - 130, W, 130, dark);
      cs += tx(seller.name || "BILLIT", 40, H - 45, 22, gold, true);
      if (seller.tagline) cs += tx(seller.tagline.toUpperCase(), 40, H - 62, 8, muted, false);
      if (seller.email) cs += tx("Email: " + seller.email, 40, H - 82, 9, muted, false);
      if (seller.phone) cs += tx("Phone: " + seller.phone, 40, H - 96, 9, muted, false);
      cs += tx(inv.id, W - 160, H - 45, 16, gold, true);
      const stCol = inv.status === "paid" ? [0.2, 0.7, 0.4] : inv.status === "overdue" ? [0.9, 0.3, 0.3] : [0.5, 0.5, 0.8];
      cs += fr(W - 160, H - 78, 80, 18, stCol);
      cs += tx(inv.status.toUpperCase(), W - 152, H - 68, 8, [1, 1, 1], true);
      cs += hl(40, H - 138, W - 40, [0.16, 0.14, 0.22], 1);
      cs += tx("Issued: " + inv.date, 40, H - 158, 10, muted, false);
      cs += tx("Due: " + inv.due, 200, H - 158, 10, muted, false);
      cs += tx("Billed To:", 40, H - 178, 9, muted, true);
      cs += tx(client?.name || "—", 40, H - 194, 12, light, true);
      if (client?.email) cs += tx(client.email, 40, H - 210, 9, muted, false);
      if (client?.phone) cs += tx(client.phone, 40, H - 224, 9, muted, false);
      cs += hl(40, H - 248, W - 40, [0.16, 0.14, 0.22], 0.5);
      cs += tx("Description", 40, H - 266, 9, muted, true);
      cs += tx("Qty", 310, H - 266, 9, muted, true);
      cs += tx("Price", 370, H - 266, 9, muted, true);
      cs += tx("Tax", 440, H - 266, 9, muted, true);
      cs += tx("Amount", 510, H - 266, 9, muted, true);
      cs += hl(40, H - 272, W - 40, [0.16, 0.14, 0.22], 0.5);
      let iy = H - 290;
      inv.items.forEach((it, i) => {
        if (i % 2 === 0) cs += fr(36, iy - 6, W - 72, 22, [0.09, 0.08, 0.13]);
        cs += tx(String(it.desc || "").substring(0, 28), 44, iy + 2, 10, light, false);
        cs += tx(String(it.qty), 314, iy + 2, 10, light, false);
        cs += tx(fmt(it.price), 366, iy + 2, 10, light, false);
        cs += tx((it.tax || 0) + "%", 444, iy + 2, 10, light, false);
        cs += tx(fmt((it.qty || 0) * (it.price || 0)), 506, iy + 2, 10, light, false);
        iy -= 26;
      });
      cs += hl(40, iy, W - 40, [0.16, 0.14, 0.22], 0.5); iy -= 16;
      cs += tx("Subtotal", 370, iy, 10, muted, false); cs += tx(fmt(sub), 506, iy, 10, light, false); iy -= 16;
      cs += tx("Tax", 370, iy, 10, muted, false); cs += tx(fmt(taxAmt), 506, iy, 10, [0.95, 0.76, 0.24], false); iy -= 6;
      cs += hl(350, iy, W - 40, [0.16, 0.14, 0.22], 0.5); iy -= 16;
      cs += fr(350, iy - 8, W - 390, 28, dark);
      cs += tx("TOTAL", 370, iy, 11, muted, true); cs += tx(fmt(grand), 506, iy, 13, gold, true);
      cs += fr(0, 0, W, 50, dark);
      cs += hl(0, 50, W, [0.16, 0.14, 0.22], 1);
      cs += tx("Generated by BILLIT", 40, 18, 9, muted, false);
      cs += tx(new Date().toLocaleDateString(), W - 160, 18, 9, muted, false);
      return cs;
    });

    // Now build the PDF object table with known structure:
    // obj 1 = font bold, obj 2 = font regular, obj 3 = Pages
    // then for each page: obj (4+i*2) = stream, obj (5+i*2) = page
    // obj (4+n*2) = catalog
    let pdf = "%PDF-1.4\n";
    const offsets = [];
    const n = pageStreams.length;
    const streamObjNums = pageStreams.map((_, i) => 4 + i * 2);
    const pageObjNums = pageStreams.map((_, i) => 5 + i * 2);
    const pagesObjNum = 3;
    const catObjNum = 4 + n * 2;
    const totalObjs = catObjNum;

    const writeObj = (num, body) => {
      offsets[num] = pdf.length;
      pdf += num + " 0 obj\n" + body + "\nendobj\n";
    };
    writeObj(1, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    writeObj(2, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    writeObj(pagesObjNum, "<< /Type /Pages /Kids [" + pageObjNums.map(n => n + " 0 R").join(" ") + "] /Count " + n + " >>");
    pageStreams.forEach((cs, i) => {
      writeObj(streamObjNums[i], "<< /Length " + cs.length + " >>\nstream\n" + cs + "\nendstream");
      writeObj(pageObjNums[i], "<< /Type /Page /Parent " + pagesObjNum + " 0 R /MediaBox [0 0 " + W + " " + H + "] /Contents " + streamObjNums[i] + " 0 R /Resources << /Font << /Fb 1 0 R /Fr 2 0 R >> >> >>");
    });
    writeObj(catObjNum, "<< /Type /Catalog /Pages " + pagesObjNum + " 0 R >>");
    const xrefOffset = pdf.length;
    pdf += "xref\n0 " + (totalObjs + 1) + "\n0000000000 65535 f \n";
    for (let i = 1; i <= totalObjs; i++) {
      pdf += String(offsets[i] || 0).padStart(10, "0") + " 00000 n \n";
    }
    pdf += "trailer\n<< /Size " + (totalObjs + 1) + " /Root " + catObjNum + " 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF";
    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "invoices-" + n + "-receipts.pdf"; a.click(); URL.revokeObjectURL(url);
    showToast("Downloaded " + n + " invoices as PDF!");
  };

  const shareReceipt = (inv, client) => {
    const sub = total(inv.items);
    const taxAmt = inv.items.reduce((s, i) => s + itemTax(i), 0);
    const grand = sub + taxAmt;
    const lines = inv.items.map(it => `• ${it.desc} ×${it.qty} @ ${fmt(it.price)} = ${fmt(it.qty * it.price)}`).join("\n");
    const text = `🧾 Invoice ${inv.id}\n${seller.name}\n\nBilled To: ${client?.name || "—"}\nDate: ${inv.date} | Due: ${inv.due}\nStatus: ${inv.status.toUpperCase()}\n\nItems:\n${lines}\n\nSubtotal: ${fmt(sub)}\nTax: ${fmt(taxAmt)}\nTotal: ${fmt(grand)}\n\nGenerated by BILLIT`;
    setShareData({ text, invId: inv.id, subject: `Invoice ${inv.id} from ${seller.name}` });
  };

  const printInvoice = (inv) => {
    const client = getClient(inv.clientId);
    setPrintData({ inv, client });
  };

  const closePrint = () => setPrintData(null);

  const downloadReceipt = (inv, client) => {
    // ── Pure-JS PDF builder (no CDN, no library) ──────────────────────────
    const subtotal = total(inv.items);
    const tax = subtotal * 0.1;
    const grand = subtotal + tax;
    const statusLabel = inv.status.charAt(0).toUpperCase() + inv.status.slice(1);

    const scMap = { paid: "4ade80", sent: "818cf8", draft: "a8a29e", overdue: "f87171" };
    const hex2rgb = h => [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
    const sc = hex2rgb(scMap[inv.status] || "e8e3d9");

    const esc = s => String(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const currency = n => "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    // PDF coordinate system: origin bottom-left, y increases upward
    // A4 = 595.28 x 841.89 pts  (1 pt = 1/72 inch)
    const PW = 595.28, PH = 841.89;
    const M = 40;   // left/right margin

    const objects = [];
    let objNum = 0;

    const addObj = (content) => {
      objNum++;
      objects.push({ num: objNum, content });
      return objNum;
    };

    // Stream builder
    const lines = [];
    const s = (...args) => lines.push(args.join(" "));

    const moveTo = (x, y) => s(x.toFixed(2), y.toFixed(2), "m");
    const lineTo = (x, y) => s(x.toFixed(2), y.toFixed(2), "l");
    const stroke = () => s("S");
    const fill = () => s("f");
    const fillStroke = () => s("B");
    const endPath = () => s("n");

    const setRGB = (r, g, b) => s(r.toFixed(3), g.toFixed(3), b.toFixed(3), "rg"); // fill
    const setRGBs = (r, g, b) => s(r.toFixed(3), g.toFixed(3), b.toFixed(3), "RG"); // stroke
    const setLW = (w) => s(w.toFixed(2), "w");
    const setDash = (on, off) => s(`[${on} ${off}]`, "0", "d");
    const unDash = () => s("[] 0 d");

    const rect = (x, y, w, h) => s(x.toFixed(2), y.toFixed(2), w.toFixed(2), h.toFixed(2), "re");

    const beginText = () => s("BT");
    const endText = () => s("ET");
    const setFont = (f, size) => s(`/${f}`, size, "Tf");
    const moveText = (x, y) => s(x.toFixed(2), y.toFixed(2), "Td");
    const showText = (t) => s(`(${esc(t)}) Tj`);

    // Helper: draw text at absolute position
    const text = (str, x, y, font = "F1", size = 10) => {
      beginText();
      setFont(font, size);
      moveText(x, y);
      showText(str);
      endText();
    };

    // Right-aligned text
    const textRight = (str, rightX, y, font = "F1", size = 10) => {
      // Approximate: Helvetica avg char ~0.5 * size pts
      const approxW = str.length * size * 0.45;
      text(str, rightX - approxW, y, font, size);
    };

    // Centered text
    const textCenter = (str, cx, y, font = "F1", size = 10) => {
      const approxW = str.length * size * 0.45;
      text(str, cx - approxW / 2, y, font, size);
    };

    // ── Draw header background ─────────────────────────────────────────────
    setRGB(0.059, 0.059, 0.098);    // #0f0f19
    rect(0, PH - 160, PW, 160);
    fill();

    // Logo
    setRGB(0.961, 0.784, 0.259);    // gold #f5c842
    text("BILLIT", M, PH - 45, "F2", 32);

    setRGB(0.42, 0.396, 0.502);     // muted
    text("PROFESSIONAL BILLING", M, PH - 62, "F1", 9);

    // Invoice ID
    setRGB(0.91, 0.89, 0.855);      // light
    text(inv.id, M, PH - 80, "F2", 17);

    setRGB(0.42, 0.396, 0.502);
    text("Tax Invoice / Receipt", M, PH - 94, "F1", 8);

    // Status badge background
    const [sr, sg, sb] = sc;
    setRGB(sr * 0.2, sg * 0.2, sb * 0.2);
    rect(PW - M - 95, PH - 96, 90, 17);
    fill();
    setRGB(sr, sg, sb);
    text(statusLabel.toUpperCase(), PW - M - 88, PH - 88, "F2", 7);

    // ── Body ──────────────────────────────────────────────────────────────
    let y = PH - 180;

    // LABELS ROW
    setRGB(0.42, 0.40, 0.50);
    text("BILLED TO", M, y, "F1", 7);
    text("INVOICE DATE", 350, y, "F1", 7);
    text("DUE DATE", 470, y, "F1", 7);
    y -= 15;

    // Client name
    setRGB(0.067, 0.067, 0.067);
    text(client?.name || "—", M, y, "F2", 12);
    text(inv.date, 350, y, "F2", 10);
    text(inv.due, 470, y, "F2", 10);
    y -= 14;

    setRGB(0.42, 0.447, 0.502);
    for (const line of [client?.email || "", client?.phone || "", client?.address || ""]) {
      if (line) { text(line, M, y, "F1", 8); y -= 11; }
    }
    y -= 8;

    // Divider
    setRGBs(0.94, 0.929, 0.91);
    setLW(0.5);
    moveTo(M, y); lineTo(PW - M, y); stroke();
    y -= 12;

    // Section label
    setRGB(0.42, 0.40, 0.50);
    text("LINE ITEMS", M, y, "F1", 7);
    y -= 8;

    // Table header bg
    setRGB(0.98, 0.973, 0.965);
    rect(M, y - 4, PW - M * 2, 18); fill();
    setRGB(0.42, 0.447, 0.502);
    text("DESCRIPTION", M + 4, y + 5, "F2", 7.5);
    textCenter("QTY", 360, y + 5, "F2", 7.5);
    textRight("UNIT PRICE", 460, y + 5, "F2", 7.5);
    textRight("AMOUNT", PW - M, y + 5, "F2", 7.5);
    y -= 20;

    // Item rows
    inv.items.forEach((item, idx) => {
      const amt = item.qty * item.price;
      if (idx % 2 === 1) {
        setRGB(0.976, 0.969, 0.957);
        rect(M, y - 4, PW - M * 2, 16); fill();
      }
      setRGB(0.067, 0.067, 0.067);
      text(item.desc || "—", M + 4, y + 4, "F1", 9);
      setRGB(0.42, 0.447, 0.502);
      textCenter(String(item.qty), 360, y + 4, "F1", 9);
      textRight(currency(item.price), 460, y + 4, "F1", 9);
      setRGB(0.067, 0.067, 0.067);
      textRight(currency(amt), PW - M, y + 4, "F2", 9);

      setRGBs(0.957, 0.949, 0.937);
      setLW(0.3);
      moveTo(M, y - 4); lineTo(PW - M, y - 4); stroke();
      y -= 18;
    });

    y -= 8;

    // Totals
    const totX = 340;
    setRGBs(0.94, 0.929, 0.91);
    setLW(0.5);
    moveTo(totX, y); lineTo(PW - M, y); stroke();
    y -= 14;

    setRGB(0.42, 0.447, 0.502);
    text("Subtotal", totX, y, "F1", 9);
    textRight(currency(subtotal), PW - M, y, "F1", 9);
    y -= 13;
    text("Tax (10%)", totX, y, "F1", 9);
    textRight(currency(tax), PW - M, y, "F1", 9);
    y -= 8;

    setRGBs(0.94, 0.929, 0.91);
    setLW(0.5);
    moveTo(totX, y); lineTo(PW - M, y); stroke();
    y -= 6;

    // Grand total dark box
    setRGB(0.059, 0.059, 0.098);
    rect(totX - 4, y - 6, PW - totX - M + 8, 20); fill();
    setRGB(0.62, 0.604, 0.678);
    text("TOTAL DUE", totX + 2, y + 2, "F1", 8);
    setRGB(0.961, 0.784, 0.259);
    textRight(currency(grand), PW - M - 4, y + 3, "F2", 15);
    y -= 28;

    // Notes
    if (inv.notes) {
      setRGB(0.98, 0.973, 0.965);
      rect(M, y - 6, PW - M * 2, 20); fill();
      setRGB(0.961, 0.784, 0.259);
      setLW(2);
      moveTo(M, y - 6); lineTo(M, y + 14); stroke();
      setRGB(0.42, 0.447, 0.502);
      text(`"${inv.notes}"`, M + 8, y + 2, "F1", 8);
      y -= 30;
    }

    // Footer
    setRGBs(0.898, 0.878, 0.851);
    setLW(0.4);
    setDash(3, 3);
    moveTo(M, 30); lineTo(PW - M, 30); stroke();
    unDash();
    setRGB(0.769, 0.749, 0.72);
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    textCenter(`Generated by BILLIT  ·  ${today}  ·  Thank you for your business.`, PW / 2, 18, "F1", 7);

    // ── Assemble PDF ───────────────────────────────────────────────────────
    const streamContent = lines.join("\n");

    // Object 1: catalog
    addObj("<< /Type /Catalog /Pages 2 0 R >>");
    // Object 2: pages
    addObj(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
    // Object 3: page
    addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW.toFixed(2)} ${PH.toFixed(2)}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`);
    // Object 4: content stream
    const streamBytes = new TextEncoder().encode(streamContent);
    addObj(`<< /Length ${streamBytes.length} >>\nstream\n${streamContent}\nendstream`);
    // Object 5: Helvetica
    addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
    // Object 6: Helvetica-Bold
    addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);

    // Build xref table
    let pdf = "%PDF-1.4\n";
    const offsets = [];
    for (const obj of objects) {
      offsets.push(pdf.length);
      pdf += `${obj.num} 0 obj\n${obj.content}\nendobj\n`;
    }
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += `0000000000 65535 f \n`;
    for (const off of offsets) {
      pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
    pdf += `startxref\n${xrefOffset}\n%%EOF`;

    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inv.id}-receipt.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const s = { // eslint-disable-line // styles
    app: { minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Georgia', serif", maxWidth: 480, margin: "0 auto", position: "relative", paddingBottom: 80 },
    header: { background: T.headerBg, padding: "28px 20px 20px", borderBottom: `1px solid ${T.headerBorder}` },
    headerTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    logo: { fontSize: 24, fontWeight: "bold", letterSpacing: "1px", background: "linear-gradient(90deg, #f5c842, #e8a020)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    logoSub: { fontSize: 9, color: "#6b6580", letterSpacing: 2, textTransform: "uppercase", marginTop: 0 },
    addBtn: { background: "linear-gradient(135deg, #f5c842, #e8a020)", border: "none", borderRadius: 12, padding: "10px 18px", color: "#0a0a0f", fontWeight: "bold", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 },
    nav: { display: "flex", background: T.navBg, borderTop: `1px solid ${T.navBorder}`, position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, zIndex: 100 },
    navBtn: (active) => ({ flex: 1, padding: "10px 2px 8px", background: "none", border: "none", color: active ? "#f5c842" : "#6b6580", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontSize: 9, fontFamily: "'Georgia', serif", borderTop: active ? "2px solid #f5c842" : "2px solid transparent", transition: "all 0.2s" }),
    card: { background: T.cardBg, borderRadius: 16, padding: 20, margin: "16px 16px 0", border: `1px solid ${T.cardBorder}` },
    statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "16px 16px 0" },
    statCard: (color) => ({ background: T.cardBg, borderRadius: 14, padding: "18px 16px", border: `1px solid ${color}33`, position: "relative", overflow: "hidden" }),
    statGlow: (color) => ({ position: "absolute", top: -30, right: -30, width: 80, height: 80, borderRadius: "50%", background: `${color}15`, filter: "blur(20px)" }),
    statLabel: { fontSize: 10, color: "#6b6580", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 },
    statValue: (color) => ({ fontSize: 22, fontWeight: "bold", color, lineHeight: 1 }),
    invoiceCard: (status) => ({ background: T.cardBg, borderRadius: 14, padding: 16, margin: "0 16px 10px", border: `1px solid ${T.cardBorder}`, cursor: "pointer", transition: "all 0.2s", position: "relative", overflow: "hidden" }),
    badge: (status) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1, background: statusColors[status].bg, color: statusColors[status].text, border: `1px solid ${statusColors[status].border}` }),
    input: { width: "100%", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: "12px 14px", color: T.text, fontSize: 14, fontFamily: "'Georgia', serif", boxSizing: "border-box", outline: "none" },
    select: { width: "100%", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: "12px 14px", color: T.text, fontSize: 14, fontFamily: "'Georgia', serif", boxSizing: "border-box", outline: "none" },
    label: { display: "block", fontSize: 11, color: T.textSub, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 },
    modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" },
    modalContent: { background: T.modalBg, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", padding: "24px 20px 40px", border: `1px solid ${T.divider}`, borderBottom: "none" },
    modalHandle: { width: 40, height: 4, background: T.handle, borderRadius: 2, margin: "0 auto 24px" },
    modalTitle: { fontSize: 20, fontWeight: "bold", color: T.text, marginBottom: 24 },
    row: { marginBottom: 16 },
    primaryBtn: { width: "100%", background: "linear-gradient(135deg, #f5c842, #e8a020)", border: "none", borderRadius: 12, padding: "14px", color: "#0a0a0f", fontWeight: "bold", fontSize: 15, cursor: "pointer", marginTop: 8, fontFamily: "'Georgia', serif" },
    secondaryBtn: { width: "100%", background: "transparent", border: `1px solid ${T.divider}`, borderRadius: 12, padding: "12px", color: T.textSub, fontSize: 14, cursor: "pointer", fontFamily: "'Georgia', serif" },
    dangerBtn: { background: "transparent", border: "1px solid #7f1d1d", borderRadius: 10, padding: "10px 16px", color: "#f87171", fontSize: 13, cursor: "pointer", fontFamily: "'Georgia', serif" },
    divider: { height: 1, background: T.divider, margin: "20px 0" },
    sectionTitle: { fontSize: 13, color: "#6b6580", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14, padding: "0 16px" },
    searchRow: { display: "flex", gap: 10, padding: "14px 16px 0", alignItems: "center" },
    searchInput: { flex: 1, background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: "10px 14px", color: T.text, fontSize: 14, fontFamily: "'Georgia', serif", outline: "none" },
    filterBtns: { display: "flex", gap: 6, padding: "10px 16px 0", overflowX: "auto" },
    filterBtn: (active) => ({ padding: "6px 14px", borderRadius: 20, border: "none", background: active ? "#f5c842" : "#1a1825", color: active ? "#0a0a0f" : "#9e9aad", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Georgia', serif", fontWeight: active ? "bold" : "normal" }),
    itemRow: { display: "grid", gridTemplateColumns: "1fr 46px 72px 52px 70px 28px", gap: 5, alignItems: "center", marginBottom: 8 },
    toast: (type) => ({ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: type === "error" ? "#2d0a0a" : "#0d2818", border: `1px solid ${type === "error" ? "#7f1d1d" : "#166534"}`, borderRadius: 12, padding: "12px 20px", color: type === "error" ? "#f87171" : "#4ade80", fontSize: 13, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }),
    clientCard: { background: T.cardBg, borderRadius: 14, padding: 16, margin: "0 16px 10px", border: `1px solid ${T.cardBorder}` },
    avatar: (n) => ({ width: 40, height: 40, borderRadius: 12, background: `hsl(${n * 47 % 360}, 40%, 30%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }),
  };

  const buildMenuShareText = () => {
    const star = "✦";
    const divider = "┄".repeat(24);
    const biz = seller.name || "BILLIT";
    const lines = [];
    lines.push("✦ " + biz.toUpperCase() + " ✦");
    if (seller.tagline) lines.push(seller.tagline);
    lines.push("");
    if (seller.email) lines.push("✉  " + seller.email);
    if (seller.phone) lines.push("📱 " + seller.phone);
    if (seller.address) lines.push("📍 " + seller.address);
    lines.push("");
    lines.push(divider);
    lines.push("  " + inventoryTitle.toUpperCase());
    lines.push(divider);
    lines.push("");
    if (products.length === 0) {
      lines.push("  No items available.");
    } else {
      products.forEach((p, i) => {
        const num = String(i + 1).padStart(2, " ");
        const name = p.name;
        const price = fmt(p.price);
        lines.push(num + ".  " + name);
        lines.push("     " + price);
        lines.push("");
      });
    }
    lines.push(divider);
    lines.push("");
    lines.push("🏷  Powered by BILLIT");
    lines.push("📅 " + new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
    return lines.join("\n");
  };

  const downloadMenuCard = () => {
    const biz = seller.name || "BILLIT";
    const W = 595, H = 842;
    const gold = [0.961, 0.784, 0.259]; // #f5c842
    const dark = [0.059, 0.059, 0.098]; // #0f0f18
    const mid = [0.118, 0.110, 0.149]; // #1e1c26
    const light = [0.910, 0.890, 0.851]; // #e8e3d9
    const muted = [0.620, 0.604, 0.678]; // #9e9aad
    const white = [1, 1, 1];

    const esc = s => String(s).replace(/[()\\]/g, c => "\\" + c);
    // PDF object tracker
    let objCount = 0;
    const objs = [];
    const addObj = (content) => { objs.push(content); return ++objCount; };

    // Font obj
    const fontId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    const fontRegId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

    // Content stream
    let cs = "";
    const rg = ([r, g, b]) => `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg\n`;
    const RG = ([r, g, b]) => `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG\n`;
    const rect = (x, y, w, h, fill) => `${rg(fill)}${x} ${y} ${w} ${h} re f\n`;
    const txt = (text, x, y, size, color, bold = false) =>
      `BT /${bold ? "Fb" : "Fr"} ${size} Tf ${rg(color)}${x.toFixed(1)} ${y.toFixed(1)} Td (${esc(text)}) Tj ET\n`;
    const line = (x1, y1, x2, y2, color, w = 0.5) =>
      `${RG(color)}${w} w ${x1} ${y1} m ${x2} ${y2} l S\n`;

    // Background
    cs += rect(0, 0, W, H, [0.075, 0.063, 0.11]);

    // Header dark band
    cs += rect(0, H - 160, W, 160, dark);

    // Business name
    cs += txt(biz, 40, H - 70, 36, gold, true);

    // Tagline
    if (seller.tagline) cs += txt(seller.tagline.toUpperCase(), 40, H - 88, 9, muted, false);

    // Contact info
    let cx = 40; const cy = H - 118;
    if (seller.email) { cs += txt("Email: " + seller.email, cx, cy, 9, muted); cx = 40; }
    if (seller.phone) { cs += txt("Phone: " + seller.phone, cx, cy - 16, 9, muted); }
    if (seller.address) { cs += txt("Address: " + seller.address, 40, cy - 32, 9, muted); }

    // Divider
    cs += line(40, H - 168, W - 40, H - 168, [0.161, 0.141, 0.22], 1);

    // Section title
    cs += txt(inventoryTitle.toUpperCase(), 40, H - 198, 10, gold, true);
    cs += line(40, H - 208, W - 40, H - 208, [0.161, 0.141, 0.22], 0.5);

    // Column headers
    cs += txt("ITEM", 40, H - 228, 8, muted);
    cs += txt("PRICE", W - 120, H - 228, 8, muted);
    cs += line(40, H - 234, W - 40, H - 234, [0.13, 0.12, 0.18], 0.5);

    // Items
    const startY = H - 256;
    if (products.length === 0) {
      cs += txt("No items added yet.", 40, startY, 12, muted);
    } else {
      products.forEach((p, i) => {
        const iy = startY - i * 30;
        if (i % 2 === 0) cs += rect(36, iy - 8, W - 72, 26, [0.09, 0.08, 0.13]);
        cs += txt(String(i + 1) + ". " + p.name, 44, iy + 4, 12, light, false);
        cs += txt(fmt(p.price), W - 120, iy + 4, 12, gold, true);
      });
    }

    // Footer
    const footerY = 50;
    cs += rect(0, 0, W, footerY + 20, dark);
    cs += line(0, footerY + 20, W, footerY + 20, [0.161, 0.141, 0.22], 1);
    cs += txt("Generated by BILLIT", 40, footerY, 9, muted);
    cs += txt(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), W - 200, footerY, 9, muted);

    const csBytes = cs.length;
    const streamId = addObj(`<< /Length ${csBytes} >>\nstream\n${cs}\nendstream`);
    const pageId = addObj(`<< /Type /Page /Parent 5 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${streamId} 0 R /Resources << /Font << /Fb ${fontId} 0 R /Fr ${fontRegId} 0 R >> >> >>`);
    const pagesId = addObj(`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`);
    const catId = addObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    let pdf = "%PDF-1.4\n";
    const offsets = [];
    objs.forEach((o, i) => {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach(o => { pdf += String(o).padStart(10, "0") + " 00000 n \n"; });
    pdf += `trailer\n<< /Size ${objs.length + 1} /Root ${catId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = (biz.replace(/\s+/g, "-").toLowerCase()) + "-inventory.pdf";
    a.click(); URL.revokeObjectURL(url);
    showToast("PDF downloaded!");
  };

  const navItems = [
    { id: "dashboard", icon: "◈", label: "Dashboard" },
    { id: "invoices", icon: "◉", label: "Invoices" },
    { id: "clients", icon: "◎", label: "Clients" },
    { id: "reports", icon: "◆", label: "Reports" },
    { id: "menu", icon: "▦", label: "Inventory" },
  ];

  return (
    <div style={s.app}>
      {/* Header */}
      <div style={s.header}>

        {/* ROW 1 — App brand (left) + Settings gear (right) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setTab("dashboard")}>
            <img src="/logo.png" alt="Billit Logo" style={{ width: 44, height: 44, borderRadius: 8 }} />
            <div style={{ ...s.logo, fontSize: 24 }}>BILLIT</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 9, color: "#3a3450", letterSpacing: 3, textTransform: "uppercase", border: "1px solid #2a2535", borderRadius: 20, padding: "3px 10px" }}>Billing App</div>
            <button
              onClick={() => setTab("settings")}
              style={{ background: tab === "settings" ? "linear-gradient(135deg,#f5c842,#e8a020)" : "#1a1825", border: tab === "settings" ? "none" : "1px solid #2a2535", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, transition: "all 0.2s" }}
              title="Settings"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={tab === "settings" ? "#0a0a0f" : "#9e9aad"}>
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>
            </button>
          </div>
        </div>

        {/* ROW 2 — Seller business name (centred) */}
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 22, fontWeight: "bold", background: "linear-gradient(90deg,#f5c842,#e8a020)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.5px", lineHeight: 1 }}>
            {seller.name || "Your Business Name"}
          </div>
          <div style={{ fontSize: 9, color: "#6b6580", letterSpacing: 3, textTransform: "uppercase", marginTop: 4 }}>
            {seller.tagline || "Professional Billing"}
          </div>
          <button
            onClick={() => { setSellerForm({ ...seller }); setShowSellerModal(true); }}
            style={{ marginTop: 8, background: "linear-gradient(135deg,#f5c842,#e8a020)", border: "none", borderRadius: 20, padding: "5px 16px", color: "#0a0a0f", fontSize: 11, fontWeight: "bold", cursor: "pointer", fontFamily: "'Georgia', serif", display: "inline-flex", alignItems: "center", gap: 5, boxShadow: "0 2px 10px rgba(245,200,66,0.35)" }}
          >✏ Edit Business Info</button>
        </div>

        {/* ROW 3 — Currency + New Invoice */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
          <button onClick={() => setShowCurrencyPicker(true)} style={{ background: "#1a1825", border: "1px solid #2a2535", borderRadius: 10, padding: "8px 14px", color: "#f5c842", fontWeight: "bold", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'Georgia', serif" }}>
            <span style={{ fontSize: 15 }}>{currency.symbol}</span>
            <span style={{ fontSize: 11, color: "#9e9aad" }}>{currency.code}</span>
            <span style={{ fontSize: 9, color: "#6b6580" }}>▼</span>
          </button>
          <button style={s.addBtn} onClick={() => { setForm(f => ({ ...f, items: [{ desc: "", qty: 1, price: 0, tax: defaultTax }] })); setShowModal("invoice"); }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Invoice
          </button>
        </div>

        {/* ROW 4 — Default Tax Rates (multi) */}
        <div style={{ background: "#0d0d18", borderRadius: 10, border: "1px solid #2a2535", padding: "10px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 10, color: "#6b6580", textTransform: "uppercase", letterSpacing: 1.5 }}>Default Tax Rates</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ background: "#1a1825", border: "1px solid #f5c842", borderRadius: 8, padding: "3px 10px", fontSize: 11, color: "#f5c842", fontWeight: "bold" }}>
                Total: {defaultTax}%
              </div>
              <button onClick={addTaxRate} style={{ background: "linear-gradient(135deg,#f5c842,#e8a020)", border: "none", borderRadius: 8, padding: "5px 12px", color: "#0a0a0f", fontSize: 11, fontWeight: "bold", cursor: "pointer", fontFamily: "'Georgia', serif", display: "flex", alignItems: "center", gap: 4 }}>
                + Add Tax
              </button>
            </div>
          </div>
          {taxRates.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <input
                value={t.name}
                onChange={e => updateTaxRate(t.id, "name", e.target.value)}
                style={{ background: "#1a1825", border: "1px solid #2a2535", borderRadius: 8, padding: "6px 10px", color: "#e8e3d9", fontSize: 12, fontFamily: "'Georgia', serif", outline: "none", width: 90, flexShrink: 0 }}
                placeholder="Tax name"
              />
              <input
                type="range" min="0" max="50" step="0.5"
                value={t.rate}
                onChange={e => updateTaxRate(t.id, "rate", e.target.value)}
                style={{ flex: 1, accentColor: "#f5c842", cursor: "pointer", height: 4 }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 3, background: "#1a1825", border: "1px solid #f5c842", borderRadius: 8, padding: "4px 8px", minWidth: 58 }}>
                <input
                  type="number" min="0" max="100" step="0.5"
                  value={t.rate}
                  onChange={e => updateTaxRate(t.id, "rate", e.target.value)}
                  style={{ background: "none", border: "none", outline: "none", color: "#f5c842", fontWeight: "bold", fontSize: 13, width: 30, textAlign: "right", fontFamily: "'Georgia', serif" }}
                />
                <span style={{ color: "#f5c842", fontSize: 12, fontWeight: "bold" }}>%</span>
              </div>
              {taxRates.length > 1 && (
                <button onClick={() => removeTaxRate(t.id)} style={{ background: "none", border: "none", color: "#f87171", fontSize: 16, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>×</button>
              )}
            </div>
          ))}
        </div>

      </div>

      {/* DASHBOARD */}
      {tab === "dashboard" && (
        <div>
          <div style={s.statsGrid}>
            <div style={s.statCard("#4ade80")}>
              <div style={s.statGlow("#4ade80")} />
              <div style={s.statLabel}>Revenue</div>
              <div style={s.statValue("#4ade80")}>{fmt(stats.paid)}</div>
              <div style={{ fontSize: 10, color: "#4ade8088", marginTop: 4 }}>↑ Collected</div>
            </div>
            <div style={s.statCard("#818cf8")}>
              <div style={s.statGlow("#818cf8")} />
              <div style={s.statLabel}>Pending</div>
              <div style={s.statValue("#818cf8")}>{fmt(stats.pending)}</div>
              <div style={{ fontSize: 10, color: "#818cf888", marginTop: 4 }}>→ Awaiting</div>
            </div>
            <div style={s.statCard("#f87171")}>
              <div style={s.statGlow("#f87171")} />
              <div style={s.statLabel}>Overdue</div>
              <div style={s.statValue("#f87171")}>{fmt(stats.overdue)}</div>
              <div style={{ fontSize: 10, color: "#f8717188", marginTop: 4 }}>⚠ Action needed</div>
            </div>
            <div style={s.statCard("#f5c842")}>
              <div style={s.statGlow("#f5c842")} />
              <div style={s.statLabel}>Drafts</div>
              <div style={{ ...s.statValue("#f5c842"), fontSize: 32 }}>{stats.draft}</div>
              <div style={{ fontSize: 10, color: "#f5c84288", marginTop: 4 }}>◈ Unsent</div>
            </div>
          </div>

          <div style={{ ...s.card, margin: "16px 16px 0" }}>
            <div style={{ fontSize: 11, color: "#6b6580", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>Total Pipeline</div>
            <div style={{ fontSize: 30, fontWeight: "bold", color: "#e8e3d9", marginBottom: 8 }}>{fmt(stats.total)}</div>
            <div style={{ height: 6, background: "#1a1825", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(stats.paid / stats.total) * 100}%`, background: "linear-gradient(90deg, #4ade80, #22c55e)", borderRadius: 3 }} />
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
              <span style={{ fontSize: 11, color: "#4ade80" }}>● {Math.round((stats.paid / stats.total) * 100)}% Collected</span>
              <span style={{ fontSize: 11, color: "#818cf8" }}>● {Math.round((stats.pending / stats.total) * 100)}% Pending</span>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={s.sectionTitle}>Recent Invoices</div>
            {invoices.slice(-3).reverse().map(inv => {
              const client = getClient(inv.clientId);
              return (
                <div key={inv.id} style={s.invoiceCard(inv.status)} onClick={() => { setSelectedInvoice(inv); setShowModal("view"); }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 13, color: "#f5c842", fontWeight: "bold", marginBottom: 2 }}>{inv.id}</div>
                      <div style={{ fontSize: 15, color: "#e8e3d9", marginBottom: 6 }}>{client?.name}</div>
                      <div style={{ fontSize: 11, color: "#6b6580" }}>Due {inv.due}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, fontWeight: "bold", color: "#e8e3d9", marginBottom: 6 }}>{fmt(totalWithTax(inv.items))}</div>
                      <div style={s.badge(inv.status)}>{inv.status}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* INVOICES */}
      {tab === "invoices" && (
        <div>
          <div style={s.searchRow}>
            <input style={s.searchInput} placeholder="🔍  Search invoices..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={s.filterBtns}>
            {["all", "draft", "sent", "paid", "overdue"].map(f => (
              <button key={f} style={s.filterBtn(filterStatus === f)} onClick={() => setFilterStatus(f)}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
            ))}
          </div>
          {/* Bulk action bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px 0" }}>
            <button
              onClick={() => { setBulkMode(b => !b); setSelectedInvoices([]); setBulkConfirmDelete(false); }}
              style={{ background: bulkMode ? "#1e1b4b" : T.inputBg, border: `1px solid ${bulkMode ? "#3730a3" : T.inputBorder}`, borderRadius: 20, padding: "5px 14px", color: bulkMode ? "#818cf8" : T.textSub, fontSize: 12, cursor: "pointer", fontFamily: "'Georgia', serif" }}
            >{bulkMode ? "✕ Cancel" : "☑ Select"}</button>
            {bulkMode && selectedInvoices.length > 0 && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: T.textSub }}>{selectedInvoices.length} selected</span>
                <button
                  onClick={() => {
                    const selInvs = selectedInvoices.map(id => invoices.find(i => i.id === id)).filter(Boolean);
                    if (selInvs.length === 1) {
                      downloadReceipt(selInvs[0], clients.find(c => c.id === selInvs[0].clientId));
                    } else {
                      downloadBulkPdf(selInvs);
                    }
                    setSelectedInvoices([]);
                    setBulkMode(false);
                  }}
                  style={{ background: "linear-gradient(135deg,#f5c842,#e8a020)", border: "none", borderRadius: 20, padding: "6px 16px", color: "#0a0a0f", fontSize: 12, fontWeight: "bold", cursor: "pointer", fontFamily: "'Georgia', serif", display: "flex", alignItems: "center", gap: 5 }}
                >⬇ Download {selectedInvoices.length}</button>
                {!bulkConfirmDelete ? (
                  <button
                    onClick={() => setBulkConfirmDelete(true)}
                    style={{ background: "#2d0a0a", border: "1px solid #7f1d1d", borderRadius: 20, padding: "6px 16px", color: "#f87171", fontSize: 12, fontWeight: "bold", cursor: "pointer", fontFamily: "'Georgia', serif", display: "flex", alignItems: "center", gap: 5 }}
                  >🗑 Delete {selectedInvoices.length}</button>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#2d0a0a", border: "1px solid #7f1d1d", borderRadius: 20, padding: "4px 6px 4px 12px" }}>
                    <span style={{ fontSize: 11, color: "#f87171", whiteSpace: "nowrap" }}>Sure?</span>
                    <button
                      onClick={() => {
                        setInvoices(prev => prev.filter(i => !selectedInvoices.includes(i.id)));
                        showToast(`${selectedInvoices.length} invoice${selectedInvoices.length > 1 ? "s" : ""} deleted`);
                        setSelectedInvoices([]);
                        setBulkMode(false);
                        setBulkConfirmDelete(false);
                      }}
                      style={{ background: "#7f1d1d", border: "none", borderRadius: 16, padding: "4px 10px", color: "#fff", fontSize: 11, fontWeight: "bold", cursor: "pointer", fontFamily: "'Georgia', serif" }}
                    >Yes</button>
                    <button
                      onClick={() => setBulkConfirmDelete(false)}
                      style={{ background: "none", border: "none", color: "#f87171", fontSize: 13, cursor: "pointer", padding: "2px 4px" }}
                    >✕</button>
                  </div>
                )}
              </div>
            )}
            {bulkMode && filtered.length > 0 && (
              <button
                onClick={() => setSelectedInvoices(selectedInvoices.length === filtered.length ? [] : filtered.map(i => i.id))}
                style={{ background: "none", border: "none", color: "#f5c842", fontSize: 11, cursor: "pointer", fontFamily: "'Georgia', serif" }}
              >{selectedInvoices.length === filtered.length ? "Deselect All" : "Select All"}</button>
            )}
          </div>
          <div style={{ marginTop: 10 }}>
            {filtered.length === 0 && <div style={{ textAlign: "center", color: "#6b6580", padding: 40 }}>No invoices found</div>}
            {filtered.map(inv => {
              const client = getClient(inv.clientId);
              const isChecked = selectedInvoices.includes(inv.id);
              return (
                <div
                  key={inv.id}
                  style={{ ...s.invoiceCard(inv.status), border: isChecked ? "2px solid #f5c842" : `1px solid ${T.cardBorder}`, position: "relative" }}
                  onClick={() => {
                    if (bulkMode) {
                      setSelectedInvoices(prev => prev.includes(inv.id) ? prev.filter(id => id !== inv.id) : [...prev, inv.id]);
                    } else {
                      setSelectedInvoice(inv); setShowModal("view");
                    }
                  }}
                >
                  {bulkMode && (
                    <div style={{ position: "absolute", top: 12, right: 12, width: 22, height: 22, borderRadius: 6, border: `2px solid ${isChecked ? "#f5c842" : T.inputBorder}`, background: isChecked ? "#f5c842" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#0a0a0f", fontWeight: "bold", zIndex: 2 }}>
                      {isChecked ? "✓" : ""}
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#f5c842", fontWeight: "bold", marginBottom: 2 }}>{inv.id}</div>
                      <div style={{ fontSize: 16, color: T.text, fontWeight: "bold" }}>{client?.name}</div>
                    </div>
                    <div style={{ ...s.badge(inv.status), marginRight: bulkMode ? 28 : 0 }}>{inv.status}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 11, color: T.textMute }}>
                      <span>{inv.items.length} item{inv.items.length !== 1 ? "s" : ""}</span>
                      <span style={{ margin: "0 8px" }}>·</span>
                      <span>Due {inv.due}</span>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: "bold", color: T.text }}>{fmt(totalWithTax(inv.items))}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CLIENTS */}
      {tab === "clients" && (
        <div>
          <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "flex-end" }}>
            <button style={{ ...s.addBtn, fontSize: 12, padding: "8px 14px" }} onClick={openAddClient}>+ Add Client</button>
          </div>
          <div style={{ marginTop: 14 }}>
            {clients.map((c, i) => {
              const clientInvoices = invoices.filter(inv => inv.clientId === c.id);
              const clientTotal = clientInvoices.reduce((s, inv) => s + totalWithTax(inv.items), 0);
              return (
                <div key={c.id} style={s.clientCard}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div style={s.avatar(i)}>{c.name.charAt(0)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: "bold", color: "#e8e3d9", marginBottom: 2 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: "#6b6580" }}>{c.email}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 15, fontWeight: "bold", color: "#f5c842" }}>{fmt(clientTotal)}</div>
                      <div style={{ fontSize: 11, color: "#6b6580" }}>{clientInvoices.length} inv.</div>
                    </div>
                  </div>
                  <div style={{ ...s.divider, margin: "12px 0 10px" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 14 }}>
                      <span style={{ fontSize: 11, color: "#6b6580" }}>📱 {c.phone}</span>
                      <span style={{ fontSize: 11, color: "#6b6580" }}>📍 {c.address.split(",")[1]?.trim() || c.address}</span>
                    </div>
                    {c.info && (
                      <div style={{ fontSize: 11, color: "#6b6580", fontStyle: "italic", marginBottom: 6, lineHeight: 1.5, borderLeft: "2px solid #2a2535", paddingLeft: 8 }}>{c.info}</div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => openEditClient(c)} style={{ background: "#1a1825", border: "1px solid #3730a3", borderRadius: 8, padding: "6px 14px", color: "#818cf8", fontSize: 12, cursor: "pointer", fontFamily: "'Georgia', serif" }}>✏ Edit</button>
                      <button onClick={() => setConfirmDelete(c.id)} style={{ background: "#1a1825", border: "1px solid #7f1d1d", borderRadius: 8, padding: "6px 14px", color: "#f87171", fontSize: 12, cursor: "pointer", fontFamily: "'Georgia', serif" }}>🗑 Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* REPORTS */}
      {tab === "reports" && (
        <div>
          <div style={{ ...s.card, marginTop: 16 }}>
            <div style={{ fontSize: 11, color: "#6b6580", textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>Revenue Breakdown</div>
            {[
              { label: "Collected", value: stats.paid, color: "#4ade80", total: stats.total },
              { label: "Awaiting", value: stats.pending, color: "#818cf8", total: stats.total },
              { label: "Overdue", value: stats.overdue, color: "#f87171", total: stats.total },
            ].map(item => (
              <div key={item.label} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "#9e9aad" }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: "bold", color: item.color }}>{fmt(item.value)}</span>
                </div>
                <div style={{ height: 8, background: "#1a1825", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(item.value / item.total) * 100}%`, background: item.color, borderRadius: 4, transition: "width 0.5s" }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...s.card, marginTop: 12 }}>
            <div style={{ fontSize: 11, color: "#6b6580", textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>By Client</div>
            {clients.map((c, i) => {
              const t = invoices.filter(inv => inv.clientId === c.id).reduce((s, inv) => s + totalWithTax(inv.items), 0);
              const maxT = Math.max(...clients.map(cl => invoices.filter(inv => inv.clientId === cl.id).reduce((s, inv) => s + totalWithTax(inv.items), 0)), 1);
              return (
                <div key={c.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: "#e8e3d9" }}>{c.name}</span>
                    <span style={{ fontSize: 13, color: "#f5c842", fontWeight: "bold" }}>{fmt(t)}</span>
                  </div>
                  <div style={{ height: 6, background: "#1a1825", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(t / maxT) * 100}%`, background: `hsl(${i * 47 % 360}, 60%, 55%)`, borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ ...s.card, marginTop: 12 }}>
            <div style={{ fontSize: 11, color: "#6b6580", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>Invoice Stats</div>
            {[
              ["Total Invoices", invoices.filter(i => i.status !== "draft").length],
              ["Avg. Invoice Value", fmt(stats.total / (invoices.filter(i => i.status !== "draft").length || 1))],
              ["Collection Rate", `${Math.round((stats.paid / (stats.total || 1)) * 100)}%`],
              ["Total Pretax Amount", fmt(stats.totalPretax)],
              ["Total Taxes Amount", fmt(stats.totalTax)],
              ["Total Amount", fmt(stats.totalAmount)],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1a1825" }}>
                <span style={{ fontSize: 13, color: "#9e9aad" }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: "bold", color: label === "Total Amount" ? "#f5c842" : "#e8e3d9" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MENU CARD */}
      {tab === "menu" && (
        <div style={{ padding: "16px 16px 100px" }}>

          {/* Action bar */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setTab("settings")}
              style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: "9px 16px", color: T.textSub, fontSize: 12, cursor: "pointer", fontFamily: "'Georgia', serif", display: "flex", alignItems: "center", gap: 6 }}
            ><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg> Manage</button>
            <button
              onClick={() => setMenuShareData({ text: buildMenuShareText(), subject: (seller.name || "BILLIT") + " — " + inventoryTitle })}
              style={{ background: "#1e1b4b", border: "1px solid #3730a3", borderRadius: 10, padding: "9px 16px", color: "#818cf8", fontSize: 12, cursor: "pointer", fontFamily: "'Georgia', serif", display: "flex", alignItems: "center", gap: 6 }}
            >🔗 Share</button>
            <button
              onClick={() => downloadMenuCard()}
              style={{ background: "linear-gradient(135deg,#f5c842,#e8a020)", border: "none", borderRadius: 10, padding: "9px 16px", color: "#0a0a0f", fontSize: 12, fontWeight: "bold", cursor: "pointer", fontFamily: "'Georgia', serif", display: "flex", alignItems: "center", gap: 6 }}
            >⬇ Download</button>
          </div>

          {/* Menu Card Preview */}
          <div style={{ background: "linear-gradient(135deg,#0f0f1a,#1a1025)", borderRadius: 16, overflow: "hidden", border: "1px solid #2a2535", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
            {/* Card Header */}
            <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid #2a2535" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                <img src="/logo.png" alt="Logo" style={{ width: 50, height: 50, borderRadius: 10 }} />
                <div style={{ fontSize: 28, fontWeight: "bold", background: "linear-gradient(90deg,#f5c842,#e8a020)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{seller.name || "Your Business Name"}</div>
              </div>
              {seller.tagline && <div style={{ fontSize: 10, color: "#6b6580", letterSpacing: 3, textTransform: "uppercase", marginTop: 4 }}>{seller.tagline}</div>}
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {seller.email && <span style={{ fontSize: 11, color: "#9e9aad" }}>✉ {seller.email}</span>}
                {seller.phone && <span style={{ fontSize: 11, color: "#9e9aad" }}>📱 {seller.phone}</span>}
                {seller.address && <span style={{ fontSize: 11, color: "#9e9aad" }}>📍 {seller.address}</span>}
              </div>

            </div>

            {/* Items */}
            <div style={{ padding: "0 0 8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 24px 10px" }}>
                {editingInventoryTitle ? (
                  <input
                    autoFocus
                    style={{ background: "#1a1825", border: "1px solid #f5c842", borderRadius: 8, padding: "4px 10px", color: "#f5c842", fontSize: 11, fontFamily: "'Georgia', serif", letterSpacing: 2, textTransform: "uppercase", outline: "none", width: 180 }}
                    value={inventoryTitle}
                    onChange={e => setInventoryTitle(e.target.value)}
                    onBlur={() => setEditingInventoryTitle(false)}
                    onKeyDown={e => e.key === "Enter" && setEditingInventoryTitle(false)}
                  />
                ) : (
                  <div style={{ fontSize: 9, color: "#6b6580", textTransform: "uppercase", letterSpacing: 2, flex: 1 }}>{inventoryTitle}</div>
                )}
                <button
                  onClick={() => setEditingInventoryTitle(v => !v)}
                  style={{ background: editingInventoryTitle ? "#f5c842" : "transparent", border: `1px solid ${editingInventoryTitle ? "#f5c842" : "#2a2535"}`, borderRadius: 8, cursor: "pointer", color: editingInventoryTitle ? "#0a0a0f" : "#6b6580", padding: "5px 8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                ><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg></button>
              </div>
              {products.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 16px", color: "#6b6580", fontSize: 13 }}>
                  No items yet.{" "}
                  <span style={{ color: "#f5c842", cursor: "pointer", textDecoration: "underline" }} onClick={() => setTab("settings")}>Add from Settings →</span>
                </div>
              ) : products.map((p, i) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 24px", borderBottom: i < products.length - 1 ? "1px solid #1a1825" : "none", transition: "background 0.15s" }}>
                  <span style={{ fontSize: 14, color: "#e8e3d9", fontWeight: "bold" }}>{p.name}</span>
                  <span style={{ fontSize: 15, color: "#f5c842", fontWeight: "bold" }}>{fmt(p.price)}</span>
                </div>
              ))}
            </div>

            {/* Card Footer */}
            <div style={{ borderTop: "1px dashed #2a2535", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 9, color: "#3a3450", textTransform: "uppercase", letterSpacing: 2 }}>Generated by BILLIT</span>
              <span style={{ fontSize: 9, color: "#3a3450" }}>{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
            </div>
          </div>

        </div>
      )}

      {/* SHARE MENU MODAL */}
      {menuShareData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && setMenuShareData(null)}>
          <div style={{ background: T.modalBg, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, padding: "24px 20px 40px" }}>
            <div style={{ width: 40, height: 4, background: T.handle, borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontSize: 16, fontWeight: "bold", color: T.text, marginBottom: 16 }}>Share {inventoryTitle}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
              {[
                { label: "WhatsApp", bg: "#25D366", href: `https://wa.me/?text=${encodeURIComponent(menuShareData.text)}`, svg: <svg viewBox="0 0 24 24" fill="#fff" width="26" height="26"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.859L.06 23.447a.75.75 0 00.919.919l5.588-1.473A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.711 9.711 0 01-4.953-1.354l-.355-.211-3.676.968.983-3.592-.231-.369A9.75 9.75 0 1112 21.75z" /></svg> },
                { label: "Email", bg: "#4f46e5", href: `mailto:?subject=${encodeURIComponent(menuShareData.subject)}&body=${encodeURIComponent(menuShareData.text)}`, svg: <svg viewBox="0 0 24 24" fill="#fff" width="26" height="26"><path d="M20 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg> },
                { label: "Telegram", bg: "#229ED9", href: `https://t.me/share/url?url=&text=${encodeURIComponent(menuShareData.text)}`, svg: <svg viewBox="0 0 24 24" fill="#fff" width="26" height="26"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.018 9.51c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.26 14.4l-2.95-.924c-.642-.204-.654-.642.136-.953l11.526-4.443c.535-.194 1.003.13.59.168z" /></svg> },
                { label: "SMS", bg: "#34C759", href: `sms:?body=${encodeURIComponent(menuShareData.text)}`, svg: <svg viewBox="0 0 24 24" fill="#fff" width="26" height="26"><path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H6l-2 2V4h16v10z" /></svg> },
              ].map(app => (
                <a key={app.label} href={app.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 16, background: app.bg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 3px 10px ${app.bg}55` }}>{app.svg}</div>
                  <span style={{ fontSize: 10, color: T.textSub }}>{app.label}</span>
                </a>
              ))}
            </div>
            <button onClick={() => { const el = document.createElement("textarea"); el.value = menuShareData.text; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); showToast("Menu card copied!"); }} style={{ width: "100%", background: "linear-gradient(135deg,#f5c842,#e8a020)", border: "none", borderRadius: 12, padding: "12px", color: "#0a0a0f", fontWeight: "bold", fontSize: 14, cursor: "pointer", fontFamily: "'Georgia', serif", marginBottom: 10 }}>📋 Copy to Clipboard</button>
            <button onClick={() => setMenuShareData(null)} style={{ width: "100%", background: "transparent", border: `1px solid ${T.divider}`, borderRadius: 12, padding: "11px", color: T.textSub, fontSize: 14, cursor: "pointer", fontFamily: "'Georgia', serif" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {tab === "settings" && (
        <div style={{ padding: "16px 16px 100px" }}>

          {/* Theme */}
          <div style={{ background: T.cardBg, borderRadius: 16, padding: 20, marginBottom: 14, border: `1px solid ${T.cardBorder}` }}>
            <div style={{ fontSize: 11, color: T.textMute, textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>Appearance</div>
            <div style={{ fontSize: 14, fontWeight: "bold", color: T.text, marginBottom: 12 }}>Theme</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { id: "dark", icon: "🌙", label: "Dark" },
                { id: "light", icon: "☀️", label: "Light" },
                { id: "system", icon: "⚙", label: "System" },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  style={{ flex: 1, padding: "12px 8px", borderRadius: 12, border: theme === opt.id ? "2px solid #f5c842" : `1px solid ${T.cardBorder}`, background: theme === opt.id ? (isDark ? "#1a1825" : "#fdf8e8") : T.inputBg, color: theme === opt.id ? "#f5c842" : T.textSub, cursor: "pointer", fontFamily: "'Georgia', serif", fontSize: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontWeight: theme === opt.id ? "bold" : "normal" }}
                >
                  <span style={{ fontSize: 20 }}>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Products Library */}
          <div style={{ background: T.cardBg, borderRadius: 16, padding: 20, marginBottom: 14, border: `1px solid ${T.cardBorder}` }}>
            <div style={{ fontSize: 11, color: T.textMute, textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>Items Library</div>
            <div style={{ fontSize: 14, fontWeight: "bold", color: T.text, marginBottom: 4 }}>Saved Products & Services</div>
            <div style={{ fontSize: 12, color: T.textSub, marginBottom: 16, lineHeight: 1.5 }}>Pre-set items to quickly select when creating invoices.</div>

            {/* Add / Edit form */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input
                style={{ ...s.input, flex: 2, fontSize: 13 }}
                placeholder="Item name"
                value={productForm.name}
                onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))}
              />
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type="number" min="0"
                  style={{ ...s.input, fontSize: 13, paddingLeft: 18 }}
                  placeholder="Price"
                  value={productForm.price}
                  onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))}
                />
                <span style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#f5c842", pointerEvents: "none" }}>{currency.symbol}</span>
              </div>
              <button
                onClick={() => {
                  if (!productForm.name || !productForm.price) return showToast("Name and price required", "error");
                  if (editingProductId) {
                    setProducts(prev => prev.map(p => p.id === editingProductId ? { ...p, name: productForm.name, price: +productForm.price } : p));
                    setEditingProductId(null);
                    showToast("Item updated!");
                  } else {
                    setProducts(prev => [...prev, { id: Date.now(), name: productForm.name, price: +productForm.price }]);
                    showToast("Item added!");
                  }
                  setProductForm({ name: "", price: "" });
                }}
                style={{ background: "linear-gradient(135deg,#f5c842,#e8a020)", border: "none", borderRadius: 10, padding: "0 14px", color: "#0a0a0f", fontWeight: "bold", fontSize: 18, cursor: "pointer", flexShrink: 0 }}
              >{editingProductId ? "✓" : "+"}</button>
            </div>

            {/* Product list */}
            {products.length === 0 && <div style={{ textAlign: "center", color: T.textMute, fontSize: 13, padding: "16px 0" }}>No items yet. Add above.</div>}
            {products.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${T.divider}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: "bold", color: T.text }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "#f5c842" }}>{fmt(p.price)}</div>
                </div>
                <button
                  onClick={() => { setEditingProductId(p.id); setProductForm({ name: p.name, price: String(p.price) }); }}
                  style={{ background: "none", border: `1px solid #3730a3`, borderRadius: 8, padding: "5px 12px", color: "#818cf8", fontSize: 11, cursor: "pointer", fontFamily: "'Georgia', serif" }}
                >✏ Edit</button>
                <button
                  onClick={() => { setProducts(prev => prev.filter(x => x.id !== p.id)); showToast("Item removed"); }}
                  style={{ background: "none", border: `1px solid #7f1d1d`, borderRadius: 8, padding: "5px 10px", color: "#f87171", fontSize: 11, cursor: "pointer" }}
                >×</button>
              </div>
            ))}
          </div>

          {/* Feedback */}
          <div style={{ background: T.cardBg, borderRadius: 16, padding: 20, marginBottom: 14, border: `1px solid ${T.cardBorder}` }}>
            <div style={{ fontSize: 11, color: T.textMute, textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>Feedback</div>
            <div style={{ fontSize: 14, fontWeight: "bold", color: T.text, marginBottom: 4 }}>Send Feedback to Creator</div>
            <div style={{ fontSize: 12, color: T.textSub, marginBottom: 16, lineHeight: 1.6 }}>Have a suggestion, bug report, or feature request? Reach out directly.</div>
            <div style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 12, padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#f5c842,#e8a020)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✉️</div>
                <div>
                  <div style={{ fontSize: 9, color: T.textMute, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 3 }}>Creator Email</div>
                  <a href="mailto:applicationmanifester@gmail.com" style={{ fontSize: 13, color: "#818cf8", fontWeight: "bold", wordBreak: "break-all", textDecoration: "none" }}>applicationmanifester@gmail.com</a>
                </div>
              </div>
              <button
                onClick={() => {
                  const el = document.createElement("textarea");
                  el.value = "applicationmanifester@gmail.com";
                  document.body.appendChild(el);
                  el.select();
                  document.execCommand("copy");
                  document.body.removeChild(el);
                  showToast("Email copied! Open your mail app and paste 📋");
                }}
                style={{ width: "100%", background: "linear-gradient(135deg,#f5c842,#e8a020)", border: "none", borderRadius: 10, padding: "11px", color: "#0a0a0f", fontWeight: "bold", fontSize: 13, cursor: "pointer", fontFamily: "'Georgia', serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
              >📋 Copy Email Address</button>
            </div>
          </div>

        </div>
      )}

      {/* NAV */}
      <nav style={s.nav}>
        {navItems.map(n => (
          <button key={n.id} style={s.navBtn(tab === n.id)} onClick={() => setTab(n.id)}>
            <span style={{ fontSize: 16 }}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>

      {/* INVOICE MODAL */}
      {showModal === "invoice" && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowModal(null)}>
          <div style={s.modalContent}>
            <div style={s.modalHandle} />
            <div style={s.modalTitle}>New Invoice</div>
            <div style={s.row}>
              <label style={s.label}>Client <span style={{ color: "#f87171" }}>*</span></label>
              <select style={s.select} value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
                <option value="">Select a client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={s.label}>Invoice Date <span style={{ color: "#f87171" }}>*</span></label>
                <input type="date" style={s.input} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Due Date <span style={{ color: "#f87171" }}>*</span></label>
                <input type="date" style={s.input} value={form.due} onChange={e => setForm(f => ({ ...f, due: e.target.value }))} />
              </div>
            </div>
            <div style={s.row}>
              <label style={s.label}>Status</label>
              <select style={s.select} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
              </select>
            </div>
            <div style={s.divider} />
            <div style={{ fontSize: 11, color: "#6b6580", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>Line Items</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 46px 72px 52px 70px 28px", gap: 5, marginBottom: 6, padding: "0 2px" }}>
              {["Description", "Qty", "Price", "Tax %", "Tax Amt", ""].map(h => <div key={h} style={{ fontSize: 9, color: "#6b6580", textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>)}
            </div>
            {form.items.map((item, idx) => (
              <div key={idx} style={s.itemRow}>
                <div style={{ position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 10, overflow: "hidden" }}>
                    <input
                      style={{ ...s.input, border: "none", borderRadius: 0, fontSize: 12, padding: "9px 8px", flex: 1, minWidth: 0 }}
                      placeholder="Description"
                      value={item.desc}
                      onChange={e => updateItem(idx, "desc", e.target.value)}
                    />
                    {products.length > 0 && (
                      <button
                        onClick={() => setOpenItemPicker(openItemPicker === idx ? null : idx)}
                        style={{ background: openItemPicker === idx ? "#f5c842" : T.inputBg, border: "none", borderLeft: `1px solid ${T.inputBorder}`, padding: "0 8px", height: "100%", minHeight: 36, cursor: "pointer", color: openItemPicker === idx ? "#0a0a0f" : "#f5c842", fontSize: 11, fontWeight: "bold", flexShrink: 0 }}
                      >▾</button>
                    )}
                  </div>
                  {openItemPicker === idx && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: T.modalBg, border: `1px solid #f5c842`, borderRadius: 10, zIndex: 999, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", overflow: "hidden" }}>
                      <div style={{ padding: "6px 10px", fontSize: 9, color: "#f5c842", textTransform: "uppercase", letterSpacing: 1.5, borderBottom: `1px solid ${T.divider}` }}>Select Item</div>
                      {products.map(p => (
                        <div
                          key={p.id}
                          onClick={() => { updateItem(idx, "desc", p.name); updateItem(idx, "price", p.price); setOpenItemPicker(null); }}
                          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", cursor: "pointer", borderBottom: `1px solid ${T.divider}` }}
                          onMouseEnter={e => e.currentTarget.style.background = isDark ? "#1a1825" : "#f0ede8"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <span style={{ fontSize: 13, color: T.text, fontWeight: "bold" }}>{p.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input type="number" style={{ ...s.input, fontSize: 12, padding: "9px 4px", textAlign: "center" }} placeholder="1" min="1" value={item.qty} onChange={e => updateItem(idx, "qty", e.target.value)} />
                <input type="number" style={{ ...s.input, fontSize: 12, padding: "9px 6px" }} placeholder="0.00" min="0" value={item.price} onChange={e => updateItem(idx, "price", e.target.value)} />
                <div style={{ position: "relative" }}>
                  <input type="number" style={{ ...s.input, fontSize: 12, padding: "9px 16px 9px 6px" }} placeholder="18" min="0" max="100" value={item.tax ?? 18} onChange={e => updateItem(idx, "tax", e.target.value)} />
                  <span style={{ position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#f5c842", pointerEvents: "none", fontWeight: "bold" }}>%</span>
                </div>
                <div style={{ background: "#0d1f10", border: "1px solid #166534", borderRadius: 8, padding: "9px 6px", fontSize: 11, color: "#4ade80", textAlign: "right", fontWeight: "bold" }}>
                  {fmt(itemTax(item))}
                </div>
                <button onClick={() => removeItem(idx)} style={{ background: "none", border: "none", color: "#f87171", fontSize: 18, cursor: "pointer", padding: 0 }}>×</button>
              </div>
            ))}
            <button onClick={addInvoiceItem} style={{ ...s.secondaryBtn, marginBottom: 16, fontSize: 12, padding: "8px" }}>+ Add Item</button>
            <div style={{ background: "#1a1825", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#9e9aad", fontSize: 13 }}>Subtotal</span>
                <span style={{ color: "#e8e3d9", fontSize: 13 }}>{fmt(total(form.items))}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#9e9aad", fontSize: 13 }}>Tax</span>
                <span style={{ color: "#e8e3d9", fontSize: 13 }}>{fmt(form.items.reduce((s, i) => s + itemTax(i), 0))}</span>
              </div>
              <div style={{ borderTop: "1px solid #2a2535", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9e9aad" }}>Total</span>
                <span style={{ fontWeight: "bold", color: "#f5c842", fontSize: 18 }}>{fmt(totalWithTax(form.items))}</span>
              </div>
            </div>
            <div style={s.row}>
              <label style={s.label}>Notes</label>
              <textarea style={{ ...s.input, minHeight: 70, resize: "none" }} placeholder="Payment terms, thank you message..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div style={{ fontSize: 11, color: "#6b6580", marginBottom: 12, textAlign: "right" }}><span style={{ color: "#f87171", fontWeight: "bold" }}>*</span> Required fields</div>
            <button style={s.primaryBtn} onClick={saveInvoice}>Create Invoice</button>
            <button style={{ ...s.secondaryBtn, marginTop: 10 }} onClick={() => setShowModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* CLIENT MODAL */}
      {showModal === "client" && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowModal(null)}>
          <div style={s.modalContent}>
            <div style={s.modalHandle} />
            <div style={s.modalTitle}>{selectedClient ? "Edit Client" : "Add Client"}</div>
            {[["Name *", "name", "text", "Full name or company"], ["Email", "email", "email", "billing@company.com"], ["Phone", "phone", "tel", "+1 555-0000"], ["Address", "address", "text", "Street, City, State"]].map(([label, field, type, placeholder]) => (
              <div key={field} style={s.row}>
                <label style={s.label}>{label}</label>
                <input type={type} style={s.input} placeholder={placeholder} value={clientForm[field]} onChange={e => setClientForm(f => ({ ...f, [field]: e.target.value }))} />
              </div>
            ))}
            <div style={s.row}>
              <label style={s.label}>Additional Information</label>
              <textarea
                style={{ ...s.input, minHeight: 80, resize: "none", lineHeight: 1.6 }}
                placeholder="Notes, payment terms, preferences, company registration, bank details..."
                value={clientForm.info}
                onChange={e => setClientForm(f => ({ ...f, info: e.target.value }))}
              />
              <div style={{ fontSize: 10, color: "#3a3450", marginTop: 4 }}>Optional — appears on receipts</div>
            </div>

            <div style={{ fontSize: 11, color: "#6b6580", marginBottom: 12, textAlign: "right" }}><span style={{ color: "#f87171", fontWeight: "bold" }}>*</span> Required fields</div>
            <button style={s.primaryBtn} onClick={saveClient}>{selectedClient ? "Update Client" : "Save Client"}</button>
            <button style={{ ...s.secondaryBtn, marginTop: 10 }} onClick={() => setShowModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE CLIENT */}
      {confirmDelete && (() => {
        const c = clients.find(cl => cl.id === confirmDelete);
        const invCount = invoices.filter(inv => inv.clientId === confirmDelete).length;
        return (
          <div style={s.modal} onClick={e => e.target === e.currentTarget && setConfirmDelete(null)}>
            <div style={{ ...s.modalContent, maxHeight: "auto" }}>
              <div style={s.modalHandle} />
              <div style={{ fontSize: 20, fontWeight: "bold", color: "#f87171", marginBottom: 12 }}>Delete Client?</div>
              <div style={{ fontSize: 14, color: "#9e9aad", marginBottom: 8, lineHeight: 1.6 }}>
                You're about to delete <span style={{ color: "#e8e3d9", fontWeight: "bold" }}>{c?.name}</span>.
              </div>
              {invCount > 0 && (
                <div style={{ background: "#2d0a0a", border: "1px solid #7f1d1d", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#f87171" }}>
                  ⚠ This will also delete <strong>{invCount} invoice{invCount > 1 ? "s" : ""}</strong> linked to this client.
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => deleteClient(confirmDelete)} style={{ flex: 1, background: "linear-gradient(135deg,#7f1d1d,#991b1b)", border: "none", borderRadius: 12, padding: "13px", color: "#fff", fontWeight: "bold", fontSize: 14, cursor: "pointer", fontFamily: "'Georgia', serif" }}>Yes, Delete</button>
                <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, ...s.secondaryBtn }}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* VIEW INVOICE MODAL */}
      {showModal === "view" && selectedInvoice && (() => {
        const inv = selectedInvoice;
        const client = getClient(inv.clientId);
        return (
          <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowModal(null)}>
            <div style={s.modalContent}>
              <div style={s.modalHandle} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                  <img src="/logo.png" alt="Logo" style={{ width: 56, height: 56, borderRadius: 12 }} />
                  <div>
                    <div style={{ fontSize: 24, fontWeight: "bold", color: "#f5c842" }}>{inv.id}</div>
                    <div style={{ fontSize: 18, color: "#e8e3d9", marginTop: 2 }}>{client?.name}</div>
                  </div>
                </div>
                <div style={s.badge(inv.status)}>{inv.status}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ background: "#1a1825", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: "#6b6580", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Issued</div>
                  <div style={{ fontSize: 13, color: "#e8e3d9" }}>{inv.date}</div>
                </div>
                <div style={{ background: "#1a1825", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: "#6b6580", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Due</div>
                  <div style={{ fontSize: 13, color: "#e8e3d9" }}>{inv.due}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#6b6580", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Items</div>
              {inv.items.map((item, i) => (
                <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #1a1825" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 14, color: "#e8e3d9" }}>{item.desc}</div>
                      <div style={{ fontSize: 11, color: "#6b6580", marginTop: 2 }}>×{item.qty} @ {fmt(item.price)}{item.tax ? ` + ${item.tax}% tax` : ""}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: "bold", color: "#e8e3d9" }}>{fmt(item.qty * item.price)}</div>
                      {item.tax > 0 && <div style={{ fontSize: 10, color: "#f5c842", marginTop: 2 }}>+{fmt(itemTax(item))} tax</div>}
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ padding: "10px 0", borderBottom: "1px solid #1a1825", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#9e9aad" }}>Subtotal</span>
                <span style={{ fontSize: 13, color: "#e8e3d9" }}>{fmt(total(inv.items))}</span>
              </div>
              <div style={{ padding: "10px 0", borderBottom: "1px solid #1a1825", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#9e9aad" }}>Tax</span>
                <span style={{ fontSize: 13, color: "#f5c842" }}>{fmt(inv.items.reduce((s, i) => s + itemTax(i), 0))}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", marginTop: 4 }}>
                <span style={{ fontSize: 16, color: "#9e9aad" }}>Total</span>
                <span style={{ fontSize: 24, fontWeight: "bold", color: "#f5c842" }}>{fmt(totalWithTax(inv.items))}</span>
              </div>
              {inv.notes && <div style={{ background: "#1a1825", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#9e9aad", marginBottom: 16, fontStyle: "italic" }}>{inv.notes}</div>}
              <div style={s.divider} />
              <div style={{ fontSize: 11, color: "#6b6580", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Update Status</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {["draft", "sent", "paid", "overdue"].filter(st => st !== inv.status).map(st => (
                  <button key={st} onClick={() => { updateStatus(inv.id, st); setShowModal(null); }} style={{ padding: "8px 16px", borderRadius: 20, border: `1px solid ${statusColors[st].border}`, background: statusColors[st].bg, color: statusColors[st].text, fontSize: 12, cursor: "pointer", fontFamily: "'Georgia', serif" }}>
                    Mark {st}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button
                  onClick={() => shareReceipt(inv, client)}
                  style={{ flex: 1, background: "linear-gradient(135deg,#3730a3,#4f46e5)", border: "none", borderRadius: 10, padding: "11px 16px", color: "#fff", fontWeight: "bold", fontSize: 13, cursor: "pointer", fontFamily: "'Georgia', serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
                >🔗 Share Receipt</button>
                <button
                  onClick={() => printInvoice(inv)}
                  style={{ flex: 1, background: "linear-gradient(135deg,#f5c842,#e8a020)", border: "none", borderRadius: 10, padding: "11px 16px", color: "#0a0a0f", fontWeight: "bold", fontSize: 13, cursor: "pointer", fontFamily: "'Georgia', serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
                >🖨 Print Receipt</button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={s.dangerBtn} onClick={() => deleteInvoice(inv.id)}>🗑 Delete</button>
                <button style={{ ...s.secondaryBtn, flex: 1 }} onClick={() => setShowModal(null)}>✕ Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SELLER EDIT MODAL */}
      {showSellerModal && sellerForm && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowSellerModal(false)}>
          <div style={s.modalContent}>
            <div style={s.modalHandle} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={s.modalTitle}>Seller Details</div>
              <div style={{ fontSize: 11, color: "#6b6580", marginTop: 2 }}>Appears on every invoice receipt</div>
            </div>
            {[
              ["Business Name *", "name", "text", "Your Company Name"],
              ["Tagline / Slogan", "tagline", "text", "Professional Billing"],
              ["Email", "email", "email", "seller@business.com"],
              ["Phone", "phone", "tel", "+1 000-000-0000"],
              ["Address", "address", "text", "123 Main St, City, State"],
              ["GSTIN / Tax ID", "gstin", "text", "Optional tax registration number"],
              ["Website", "website", "url", "https://yourbusiness.com"],
            ].map(([label, field, type, placeholder]) => (
              <div key={field} style={s.row}>
                <label style={s.label}>{label}</label>
                <input
                  type={type}
                  style={s.input}
                  placeholder={placeholder}
                  value={sellerForm[field]}
                  onChange={e => setSellerForm(f => ({ ...f, [field]: e.target.value }))}
                />
              </div>
            ))}
            <div style={{ background: "#1a1825", border: "1px solid #2a2535", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: "#6b6580" }}>
              💡 These details appear in the header of every printed / downloaded invoice receipt.
            </div>
            <div style={{ fontSize: 11, color: "#6b6580", marginBottom: 12, textAlign: "right" }}><span style={{ color: "#f87171", fontWeight: "bold" }}>*</span> Required fields</div>
            <button
              style={s.primaryBtn}
              onClick={() => {
                if (!sellerForm.name) return showToast("Business name is required", "error");
                setSeller(sellerForm);
                setShowSellerModal(false);
                showToast("Seller details updated!");
              }}
            >Save Seller Details</button>
            <button style={{ ...s.secondaryBtn, marginTop: 10 }} onClick={() => setShowSellerModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* SHARE SHEET MODAL */}
      {shareData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && setShareData(null)}>
          <div style={{ background: T.modalBg, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, padding: "24px 20px 40px", border: `1px solid ${T.divider}`, borderBottom: "none" }}>
            <div style={{ width: 40, height: 4, background: T.handle, borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontSize: 16, fontWeight: "bold", color: T.text, marginBottom: 6 }}>Share Invoice {shareData.invId}</div>
            <div style={{ fontSize: 12, color: T.textSub, marginBottom: 20 }}>Choose how to share this receipt</div>

            {/* App share links */}
            {(() => {
              const apps = [
                {
                  label: "WhatsApp", bg: "#25D366", href: `https://wa.me/?text=${encodeURIComponent(shareData.text)}`,
                  svg: <svg viewBox="0 0 24 24" fill="#fff" width="26" height="26"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.859L.06 23.447a.75.75 0 00.919.919l5.588-1.473A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.711 9.711 0 01-4.953-1.354l-.355-.211-3.676.968.983-3.592-.231-.369A9.75 9.75 0 1112 21.75z" /></svg>
                },
                {
                  label: "Email", bg: "#4f46e5", href: `mailto:?subject=${encodeURIComponent(shareData.subject)}&body=${encodeURIComponent(shareData.text)}`,
                  svg: <svg viewBox="0 0 24 24" fill="#fff" width="26" height="26"><path d="M20 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
                },
                {
                  label: "Telegram", bg: "#229ED9", href: `https://t.me/share/url?url=&text=${encodeURIComponent(shareData.text)}`,
                  svg: <svg viewBox="0 0 24 24" fill="#fff" width="26" height="26"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.018 9.51c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.26 14.4l-2.95-.924c-.642-.204-.654-.642.136-.953l11.526-4.443c.535-.194 1.003.13.59.168z" /></svg>
                },
                {
                  label: "Twitter/X", bg: "#000000", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text.slice(0, 240))}`,
                  svg: <svg viewBox="0 0 24 24" fill="#fff" width="24" height="24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                },
                {
                  label: "LinkedIn", bg: "#0A66C2", href: `https://www.linkedin.com/sharing/share-offsite/?url=&summary=${encodeURIComponent(shareData.text)}`,
                  svg: <svg viewBox="0 0 24 24" fill="#fff" width="26" height="26"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                },
                {
                  label: "SMS", bg: "#34C759", href: `sms:?body=${encodeURIComponent(shareData.text)}`,
                  svg: <svg viewBox="0 0 24 24" fill="#fff" width="26" height="26"><path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H6l-2 2V4h16v10z" /></svg>
                },
                {
                  label: "iMessage", bg: "#30D158", href: `sms:?&body=${encodeURIComponent(shareData.text)}`,
                  svg: <svg viewBox="0 0 24 24" fill="#fff" width="26" height="26"><path d="M12 2C6.477 2 2 6.145 2 11.259c0 2.873 1.368 5.45 3.531 7.192L4.5 22l3.912-1.818A10.978 10.978 0 0012 20.518c5.523 0 10-4.145 10-9.259S17.523 2 12 2z" /></svg>
                },
                {
                  label: "More", bg: "#6366f1", href: null,
                  svg: <svg viewBox="0 0 24 24" fill="#fff" width="26" height="26"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>,
                  onClick: () => { if (navigator.share) { navigator.share({ title: shareData.subject, text: shareData.text }).catch(() => { }); } else { showToast("Use another option above", "error"); } }
                },
              ];
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
                  {apps.map(app => {
                    const inner = (
                      <>
                        <div style={{ width: 54, height: 54, borderRadius: 16, background: app.bg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 3px 10px ${app.bg}55` }}>{app.svg}</div>
                        <span style={{ fontSize: 10, color: T.textSub, textAlign: "center", marginTop: 2 }}>{app.label}</span>
                      </>
                    );
                    return app.href !== null
                      ? <a key={app.label} href={app.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>{inner}</a>
                      : <button key={app.label} onClick={app.onClick} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: 0 }}>{inner}</button>;
                  })}
                </div>
              );
            })()}

            {/* Copy text fallback */}
            <div style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, maxHeight: 80, overflowY: "auto" }}>
              <pre style={{ margin: 0, fontSize: 11, color: T.textSub, whiteSpace: "pre-wrap", fontFamily: "'Georgia', serif" }}>{shareData.text.slice(0, 200)}…</pre>
            </div>
            <button
              onClick={() => {
                const el = document.createElement("textarea");
                el.value = shareData.text;
                document.body.appendChild(el);
                el.select();
                document.execCommand("copy");
                document.body.removeChild(el);
                showToast("Receipt text copied!");
              }}
              style={{ width: "100%", background: "linear-gradient(135deg,#f5c842,#e8a020)", border: "none", borderRadius: 12, padding: "12px", color: "#0a0a0f", fontWeight: "bold", fontSize: 14, cursor: "pointer", fontFamily: "'Georgia', serif", marginBottom: 10 }}
            >📋 Copy to Clipboard</button>
            <button onClick={() => setShareData(null)} style={{ width: "100%", background: "transparent", border: `1px solid ${T.divider}`, borderRadius: 12, padding: "11px", color: T.textSub, fontSize: 14, cursor: "pointer", fontFamily: "'Georgia', serif" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* CURRENCY PICKER MODAL */}
      {showCurrencyPicker && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowCurrencyPicker(false)}>
          <div style={{ ...s.modalContent, maxHeight: "80vh" }}>
            <div style={s.modalHandle} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={s.modalTitle}>Select Currency</div>
              <div style={{ background: "#f5c842", borderRadius: 8, padding: "4px 10px", fontSize: 16, fontWeight: "bold", color: "#0a0a0f" }}>{currency.symbol} {currency.code}</div>
            </div>
            <input
              style={{ ...s.input, marginBottom: 14 }}
              placeholder="🔍  Search currency or country..."
              value={currencySearch}
              onChange={e => setCurrencySearch(e.target.value)}
              autoFocus
            />
            <div style={{ overflowY: "auto", maxHeight: "52vh", borderRadius: 10, border: "1px solid #2a2535" }}>
              {CURRENCIES.filter((c, idx, self) =>
                self.findIndex(x => x.code === c.code) === idx &&
                (!currencySearch || c.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
                  c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
                  c.symbol.includes(currencySearch))
              ).map((c) => (
                <div
                  key={c.code}
                  onClick={() => { setCurrency(c); setShowCurrencyPicker(false); setCurrencySearch(""); showToast(`Currency set to ${c.name} (${c.symbol})`); }}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #1a1825", background: currency.code === c.code ? "#1e1b4b" : "transparent", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = currency.code === c.code ? "#1e1b4b" : "#16141f"}
                  onMouseLeave={e => e.currentTarget.style.background = currency.code === c.code ? "#1e1b4b" : "transparent"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#1a1825", border: "1px solid #2a2535", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: "bold", color: "#f5c842", flexShrink: 0 }}>{c.symbol}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: "bold", color: "#e8e3d9" }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "#6b6580", marginTop: 1 }}>{c.code} · {c.locale}</div>
                    </div>
                  </div>
                  {currency.code === c.code && <div style={{ fontSize: 16, color: "#4ade80" }}>✓</div>}
                </div>
              ))}
            </div>
            <button style={{ ...s.secondaryBtn, marginTop: 14 }} onClick={() => { setShowCurrencyPicker(false); setCurrencySearch(""); }}>Close</button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && <div style={s.toast(toast.type)}>{toast.type === "success" ? "✓" : "✕"} {toast.msg}</div>}

      {/* RECEIPT OVERLAY */}
      {printData && (() => {
        const { inv, client } = printData;
        const subtotal = total(inv.items);
        const taxAmt = inv.items.reduce((s, i) => s + itemTax(i), 0);
        const grandTotal = subtotal + taxAmt;
        const statusLabel = inv.status.charAt(0).toUpperCase() + inv.status.slice(1);
        const scMap = { paid: "#4ade80", sent: "#818cf8", draft: "#a8a29e", overdue: "#f87171" };
        const sbMap = { paid: "#166534", sent: "#3730a3", draft: "#44403c", overdue: "#7f1d1d" };
        const sbgMap = { paid: "#0d2818", sent: "#1e1b4b", draft: "#1c1917", overdue: "#2d0a0a" };
        return (
          <div id="billit-receipt-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, overflowY: "auto", padding: "20px 16px 40px" }}>
            {/* No-print top bar */}
            <div className="no-print" style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 20 }}>
              <button onClick={() => downloadReceipt(inv, client)} style={{ background: "linear-gradient(135deg,#f5c842,#e8a020)", border: "none", borderRadius: 10, padding: "12px 28px", fontWeight: "bold", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                ⬇ Download Invoice PDF
              </button>
              <button onClick={closePrint} style={{ background: "transparent", border: "1px solid #444", borderRadius: 10, padding: "12px 20px", color: "#ccc", fontSize: 14, cursor: "pointer" }}>
                ✕ Close
              </button>
            </div>

            {/* Receipt card */}
            <div style={{ maxWidth: 600, margin: "0 auto", background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 60px rgba(0,0,0,0.5)", color: "#1a1a1a", fontFamily: "Georgia,serif" }}>
              {/* Receipt Header */}
              <div style={{ background: "linear-gradient(135deg,#0f0f1a,#1a1025)", padding: "28px 36px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  {/* Logo + Seller info (left) */}
                  <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                    <img src="/logo.png" alt="Logo" style={{ width: 64, height: 64, borderRadius: 14 }} />
                    <div>
                      <div style={{ fontSize: 28, fontWeight: "bold", color: "#f5c842", letterSpacing: "-0.5px" }}>{seller.name}</div>
                      {seller.tagline && <div style={{ fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: "#6b6580", marginTop: 3 }}>{seller.tagline}</div>}
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 3 }}>
                        {seller.email && <div style={{ fontSize: 10, color: "#9e9aad" }}>✉ {seller.email}</div>}
                        {seller.phone && <div style={{ fontSize: 10, color: "#9e9aad" }}>📱 {seller.phone}</div>}
                        {seller.address && <div style={{ fontSize: 10, color: "#9e9aad" }}>📍 {seller.address}</div>}
                        {seller.gstin && <div style={{ fontSize: 10, color: "#9e9aad" }}>GST: {seller.gstin}</div>}
                        {seller.website && <div style={{ fontSize: 10, color: "#9e9aad" }}>🌐 {seller.website}</div>}
                      </div>
                    </div>
                  </div>
                  {/* Invoice ID + Status (right) */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ padding: "4px 14px", borderRadius: 20, fontSize: 10, fontWeight: "bold", letterSpacing: 1.5, textTransform: "uppercase", background: sbgMap[inv.status], color: scMap[inv.status], border: `1px solid ${sbMap[inv.status]}`, display: "inline-block", marginBottom: 12 }}>{statusLabel}</div>
                    <div style={{ fontSize: 22, fontWeight: "bold", color: "#e8e3d9" }}>{inv.id}</div>
                    <div style={{ fontSize: 11, color: "#6b6580", marginTop: 3 }}>Tax Invoice / Receipt</div>
                  </div>
                </div>
              </div>

              {/* Receipt Body */}
              <div style={{ padding: "32px 36px" }}>
                {/* Billed To / Dates */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
                  <div>
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, color: "#9ca3af", marginBottom: 5 }}>Billed To</div>
                    <div style={{ fontSize: 15, fontWeight: "bold", color: "#111" }}>{client?.name || "—"}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{client?.email}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{client?.phone}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{client?.address}</div>
                    {client?.info && (
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8, paddingTop: 8, borderTop: "1px dashed #e5e7eb", fontStyle: "italic", lineHeight: 1.6 }}>{client.info}</div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, color: "#9ca3af", marginBottom: 3 }}>Invoice Date</div>
                      <div style={{ fontSize: 14, fontWeight: "600", color: "#111" }}>{inv.date}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, color: "#9ca3af", marginBottom: 3 }}>Due Date</div>
                      <div style={{ fontSize: 14, fontWeight: "600", color: "#111" }}>{inv.due}</div>
                    </div>
                  </div>
                </div>

                {/* Items table */}
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#9ca3af", borderBottom: "1px solid #f0ede8", paddingBottom: 8, marginBottom: 0 }}>Line Items</div>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0 }}>
                  <thead>
                    <tr style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>
                      <th style={{ padding: "8px 0", textAlign: "left", fontWeight: 500 }}>Description</th>
                      <th style={{ padding: "8px 0", textAlign: "center", fontWeight: 500 }}>Qty</th>
                      <th style={{ padding: "8px 0", textAlign: "right", fontWeight: 500 }}>Unit Price</th>
                      <th style={{ padding: "8px 0", textAlign: "right", fontWeight: 500 }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f5f3f0" }}>
                        <td style={{ padding: "11px 0", fontSize: 14 }}>{item.desc || "—"}</td>
                        <td style={{ padding: "11px 0", fontSize: 13, color: "#6b7280", textAlign: "center" }}>{item.qty}</td>
                        <td style={{ padding: "11px 0", fontSize: 13, color: "#6b7280", textAlign: "right" }}>{fmt(item.price)}</td>
                        <td style={{ padding: "11px 0", fontSize: 14, fontWeight: "bold", textAlign: "right" }}>{fmt(item.qty * item.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "2px solid #f0ede8" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6b7280", marginBottom: 7 }}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6b7280", marginBottom: 7 }}><span>Tax</span><span>{fmt(taxAmt)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f0f1a", borderRadius: 10, padding: "14px 18px", marginTop: 12 }}>
                    <span style={{ fontSize: 12, color: "#9e9aad", textTransform: "uppercase", letterSpacing: 1 }}>Total Due</span>
                    <span style={{ fontSize: 24, fontWeight: "bold", color: "#f5c842" }}>{fmt(totalWithTax(inv.items))}</span>
                  </div>
                </div>

                {/* Notes */}
                {inv.notes && <div style={{ marginTop: 22, background: "#faf9f7", borderLeft: "3px solid #f5c842", borderRadius: "0 8px 8px 0", padding: "11px 15px", fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>"{inv.notes}"</div>}

                {/* Footer */}
                <div style={{ marginTop: 28, paddingTop: 16, borderTop: "1px dashed #e5e0d8", textAlign: "center", fontSize: 11, color: "#c4bfb8", letterSpacing: 0.5 }}>
                  Generated by BILLIT · {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} · Thank you for your business.
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
