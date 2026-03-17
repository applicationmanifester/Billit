import React, { useState, useMemo, useEffect, useRef } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Hooks
import { useAuth } from "./hooks/useAuth";
import { useCloudSync } from "./hooks/useCloudSync";
import { useTheme } from "./hooks/useTheme";
import { exportInvoicesToCSV, exportClientsToCSV, exportProductsToCSV } from "./lib/export";

// Constants & Libs
import { initialClients, initialInvoices, statusColors, CURRENCIES } from "./lib/constants";
import { total, getItemTaxList, itemTaxTotal, totalWithTax, formatCurrency, calculateBaseFromTotal } from "./lib/calculations";
import {
  getInventoryPDFData,
  getPDFData,
  getBatchPDF,
  getBatchThermalPDF,
  getThermalPDFData,
  getThermalInventoryPDFData
} from "./lib/pdf";

// Components
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { InvoiceManager } from "./components/InvoiceManager";
import { ClientManager } from "./components/ClientManager";
import { InventoryManager } from "./components/InventoryManager";
import { Settings } from "./components/Settings";
import { Reports } from "./components/Reports";
import { InvoiceModal } from "./components/InvoiceModal";
import { InvoiceViewModal } from "./components/InvoiceViewModal";
import { ClientModal, ProductModal } from "./components/Modals";
import { SellerModal } from "./components/SellerModal";
import { LegalModal } from "./components/LegalModal";
import { useCallback } from "react";

// Performance Utilities Outside Component
// No hexMap here, keeping it in pdf.js

const compressImage = async (dataUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width, height = img.height, max = 300;
      if (width > height && width > max) { height *= max / width; width = max; }
      else if (height > max) { width *= max / height; height = max; }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = dataUrl;
  });
};

const getLocalISODate = () => {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().split('T')[0];
};

// Sub-components
const Badge = ({ status }) => (
  <div className="badge" style={{
    background: `var(--status-${status})`,
    color: "#000",
    border: `1px solid rgba(0,0,0,0.1)`
  }}>
    {status}
  </div>
);

export default function BillingApp() {
  const getStorage = (key, def) => {
    try {
      const saved = localStorage.getItem("billit_" + key);
      if (!saved) return def;
      const parsed = JSON.parse(saved);
      return parsed !== null ? parsed : def;
    } catch (e) { return def; }
  };

  const playFeedback = (type = "click") => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(type === "error" ? [50, 50, 50] : 10);
    }
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      if (type === "click") {
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      } else if (type === "success") {
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      } else if (type === "error") {
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      }
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) { }
  };

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    playFeedback(type);
    setTimeout(() => setToast(null), 3000);
  };

  // State
  const [invoices, setInvoices] = useState(() => {
    const raw = getStorage("invoices", initialInvoices);
    // Normalize tax: ensure it's always an array
    return raw.map(inv => ({
      ...inv,
      items: (inv.items || []).map(it => ({
        ...it,
        tax: Array.isArray(it.tax) ? it.tax : (it.tax ? [it.tax] : [])
      }))
    }));
  });
  const [clients, setClients] = useState(() => getStorage("clients", initialClients));
  const { theme, setTheme, toggleTheme } = useTheme();
  const [currency, setCurrency] = useState(() => getStorage("currency", CURRENCIES[0]));
  const [taxRates, setTaxRates] = useState(() => {
    const saved = getStorage("taxRates", [{ id: 1, label: "GST", rate: 18 }]);
    if (saved.length > 0 && !saved.some(t => t.rate === 18)) {
      return [...saved, { id: 1, label: "GST", rate: 18 }];
    }
    return saved.length === 0 ? [{ id: 1, label: "GST", rate: 18 }] : saved;
  });
  const [products, setProducts] = useState(() => {
    const raw = getStorage("products", []);
    // Normalize tax for products as well
    return raw.map(p => ({
      ...p,
      tax: Array.isArray(p.tax) ? p.tax : (p.tax ? [p.tax] : [])
    }));
  });
  const [seller, setSeller] = useState(() => getStorage("seller", {
    name: "Business Name",
    tagline: "Professional Billing",
    email: "biz@example.com",
    phone: "+1 000-000-0000",
    address: "123 Street",
    gstin: "",
    website: "",
    qrCode: "",
    logo: "",
    invoicePrefix: "INV"
  }));
  const [inventoryTitle, setInventoryTitle] = useState(() => getStorage("inventoryTitle", "Inventory List"));
  const [defaultNote, setDefaultNote] = useState(() => getStorage("defaultNote", ""));
  const [editingInventoryTitle, setEditingInventoryTitle] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");
  const [openItemPicker, setOpenItemPicker] = useState(null);
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(() => getStorage("hasAcceptedLegal", false));
  const [showLegalModal, setShowLegalModal] = useState(false);

  // Hooks
  const {
    user, authLoading, authError, loginWithPopup, logout
  } = useAuth(showToast);

  // The auto-logout logic is removed because useAuth now masks 
  // the user state until explicit sign-in (and acceptance of terms) occurs.

  const cloudSyncData = useMemo(() => ({
    invoices,
    clients,
    theme,
    currency,
    taxRates,
    products,
    seller,
    inventoryTitle,
    defaultNote
  }), [invoices, clients, theme, currency, taxRates, products, seller, inventoryTitle, defaultNote]);

  const setters = useMemo(() => ({
    setInvoices, setClients, setProducts, setSeller, setTaxRates, setCurrency, setInventoryTitle, setDefaultNote, setTheme
  }), [setInvoices, setClients, setProducts, setSeller, setTaxRates, setCurrency, setInventoryTitle, setDefaultNote, setTheme]);

  const {
    syncStatus, hasLoadedCloud, syncLog, lastSync, fetchFromCloud, addLog
  } = useCloudSync(user, cloudSyncData, setters, showToast,
    hasAcceptedLegal
  );

  // Auto-overdue detection
  useEffect(() => {
    if (invoices.length === 0) return;
    const today = getLocalISODate();
    let changed = false;
    const updatedInvoices = invoices.map(inv => {
      if (inv.status === "sent" && inv.due < today) {
        changed = true;
        return { ...inv, status: "overdue" };
      }
      return inv;
    });

    if (changed) {
      setInvoices(updatedInvoices);
      addLog("Auto-updated overdue statuses");
    }
  }, [invoices.map(i => `${i.id}:${i.status}:${i.due}`).join(","), addLog]);

  // Local persistence
  useEffect(() => {
    localStorage.setItem("billit_invoices", JSON.stringify(invoices));
    localStorage.setItem("billit_clients", JSON.stringify(clients));
    localStorage.setItem("billit_products", JSON.stringify(products));
    localStorage.setItem("billit_seller", JSON.stringify(seller));
    localStorage.setItem("billit_taxRates", JSON.stringify(taxRates));
    localStorage.setItem("billit_currency", JSON.stringify(currency));
    localStorage.setItem("billit_inventoryTitle", JSON.stringify(inventoryTitle));
    localStorage.setItem("billit_defaultNote", JSON.stringify(defaultNote));
    localStorage.setItem("billit_hasAcceptedLegal", JSON.stringify(hasAcceptedLegal));
  }, [invoices, clients, products, seller, taxRates, currency, inventoryTitle, defaultNote, hasAcceptedLegal]);

  // Derived Utils
  const fmt = (n) => formatCurrency(n, currency);
  const getClient = (id) => clients.find(c => String(c.id) === String(id)) || {};

  const clearLocalState = useCallback(() => {
    setInvoices([]);
    setClients(initialClients);
    setProducts([]);
    setSeller({
      name: "My Business",
      tagline: "Professional Billing",
      email: "biz@example.com",
      phone: "+1 000-000-0000",
      address: "123 Street",
      gstin: "",
      website: "",
      qrCode: "",
      logo: "",
      invoicePrefix: "INV"
    });
    setTaxRates([{ id: 1, label: "GST", rate: 18 }]);
    setCurrency(CURRENCIES[0]);
    setInventoryTitle("Inventory List");
    setDefaultNote("");
    setHasAcceptedLegal(false);
    localStorage.clear();
  }, [setInvoices, setClients, setProducts, setSeller, setTaxRates, setCurrency, setInventoryTitle, setDefaultNote]);

  const wipeCloudState = useCallback(async () => {
    if (!user || !db) return;

    const resetPayload = {
      invoices: [],
      clients: initialClients,
      products: [],
      seller: {
        name: "My Business",
        tagline: "Professional Billing",
        email: "biz@example.com",
        phone: "+1 000-000-0000",
        address: "123 Street",
        gstin: "",
        website: "",
        qrCode: "",
        logo: "",
        invoicePrefix: "INV"
      },
      taxRates: [{ id: 1, label: "GST", rate: 18 }],
      currency: CURRENCIES[0],
      inventoryTitle: "Inventory List",
      defaultNote: "",
      lastSync: new Date().toLocaleTimeString()
    };

    await setDoc(doc(db, "users", user.uid), resetPayload, { merge: false });
  }, [user]);

  const [tab, setTab] = useState("home");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showModal, setShowModal] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [sellerForm, setSellerForm] = useState(seller);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({ name: "", desc: "", price: 0, isDefault: false, image: null, tax: taxRates.map(t => t.id) });

  const [clientForm, setClientForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [settingsTab, setSettingsTab] = useState("account");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isSaving, setIsSaving] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Background scroll lock
  useEffect(() => {
    if (showModal || showSellerModal || showCurrencyPicker || deleteConfirm || openItemPicker) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [showModal, showSellerModal, showCurrencyPicker, deleteConfirm, openItemPicker]);

  const getInitialItems = useCallback(() => {
    const defaults = (products || []).filter(p => p.isDefault);
    const taxIds = (taxRates || []).map(t => t.id);
    if (defaults.length > 0) {
      return defaults.map(p => ({ desc: p.name, qty: 1, price: p.price, tax: p.tax || taxIds }));
    }
    return [{ desc: "", qty: 1, price: 0, tax: taxIds }];
  }, [products, taxRates]);

  const [form, setForm] = useState({
    clientId: (clients && clients[0] ? clients[0].id : (initialClients[0] || {}).id) || "",
    date: getLocalISODate(),
    due: getLocalISODate(),
    items: getInitialItems(),
    notes: defaultNote
  });

  const resetForm = useCallback(() => {
    setForm({
      clientId: (clients && clients[0] ? clients[0].id : (initialClients[0] || {}).id) || "",
      date: getLocalISODate(),
      due: getLocalISODate(),
      items: getInitialItems(),
      notes: defaultNote
    });
  }, [clients, getInitialItems, defaultNote]);

  const updateItem = (index, field, value) => {
    const newItems = [...form.items];
    if (typeof field === "object") {
      newItems[index] = { ...newItems[index], ...field };
    } else {
      // Prevent negative price or qty
      let sanctionedValue = value;
      if (field === "price" || field === "qty") {
        sanctionedValue = Math.max(0, Number(value) || 0);
      }
      newItems[index] = { ...newItems[index], [field]: sanctionedValue };
    }
    setForm({ ...form, items: newItems });
  };

  const addItem = () => {
    const taxIds = taxRates.map(t => t.id);
    setForm({ ...form, items: [...form.items, { desc: "", qty: 1, price: 0, tax: taxIds }] });
  };

  const updateStatus = (id, status) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
    if (selectedInvoice && selectedInvoice.id === id) {
      setSelectedInvoice({ ...selectedInvoice, status });
    }
    showToast(`Status updated to ${status.toUpperCase()}`);
  };

  const removeItem = (index) => {
    if (form.items.length > 1) {
      setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
    } else {
      setForm({
        ...form,
        items: [{ desc: "", qty: 1, price: 0, tax: taxRates.map(t => t.id) }]
      });
    }
  };


  const showBatchPrint = useCallback((url) => {

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "-1000px";
    iframe.style.bottom = "-1000px";
    iframe.style.width = "100px";
    iframe.style.height = "100px";
    iframe.style.border = "none";
    iframe.style.zIndex = "-1000";
    iframe.src = url;
    document.body.appendChild(iframe);

    iframe.onload = () => {

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();

        } catch (e) {
          console.error("Billit: Print failure:", e);
        }
        setTimeout(() => {
          if (iframe.parentNode) document.body.removeChild(iframe);
        }, 3000);
      }, 500);
    };
  }, []);

  const downloadReceipt = useCallback(async (inv) => {
    const bytes = await getPDFData(inv, clients, seller, currency, taxRates);
    const blob = new Blob([bytes], { type: "application/pdf" }), url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `Billit - Professional Billing_${inv.id}.pdf`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, [clients, seller, currency, taxRates]);

  const downloadMultipleInvoices = useCallback(async (invs) => {
    showToast("Preparing PDF bundle...");
    const pdf = await getBatchPDF(invs, clients, seller, currency, taxRates);
    const a = document.createElement("a"); a.href = pdf.url; a.download = `Billit - Professional Billing_Bundle.pdf`; a.click();
    showToast("Batch PDF Downloaded!");
    setTimeout(() => URL.revokeObjectURL(pdf.url), 10000);
  }, [clients, seller, currency, taxRates, showToast]);

  const printMultipleInvoices = useCallback(async (invs) => {
    showToast("Preparing PDF for print...");
    const pdf = await getBatchPDF(invs, clients, seller, currency, taxRates);
    const oldTitle = document.title;
    document.title = `Billit - Professional Billing_Bundle`;
    showBatchPrint(pdf.url);
    setTimeout(() => {
      document.title = oldTitle;
      URL.revokeObjectURL(pdf.url);
    }, 30000);
  }, [clients, seller, currency, taxRates, showBatchPrint, showToast]);

  const printMultipleInvoicesThermal = useCallback(async (invs) => {
    showToast("Preparing Thermal PDF bundle...");
    const pdf = await getBatchThermalPDF(invs, clients, seller, currency, taxRates, defaultNote);
    const oldTitle = document.title;
    document.title = `Billit - Professional Billing_Bundle`;
    showBatchPrint(pdf.url);
    setTimeout(() => {
      document.title = oldTitle;
      URL.revokeObjectURL(pdf.url);
    }, 30000);
  }, [clients, seller, currency, taxRates, defaultNote, showBatchPrint, showToast]);

  const printReceipt = useCallback(async (inv) => {
    const bytes = await getPDFData(inv, clients, seller, currency, taxRates);
    const blob = new Blob([bytes], { type: "application/pdf" }), url = URL.createObjectURL(blob);

    const oldTitle = document.title;
    document.title = `Billit - Professional Billing_${inv.id}`;
    showBatchPrint(url);
    setTimeout(() => {
      document.title = oldTitle;
    }, 30000);
  }, [clients, seller, currency, taxRates, showBatchPrint]);

  const printReceiptThermal = useCallback(async (inv) => {
    const bytes = await getThermalPDFData(inv, clients, seller, currency, taxRates, defaultNote);
    const blob = new Blob([bytes], { type: "application/pdf" }), url = URL.createObjectURL(blob);

    const oldTitle = document.title;
    document.title = `Billit - Professional Billing_${inv.id}`;
    showBatchPrint(url);
    setTimeout(() => {
      document.title = oldTitle;
      URL.revokeObjectURL(url);
    }, 30000);
  }, [clients, seller, currency, taxRates, defaultNote, showBatchPrint]);

  const printInventoryThermal = useCallback(async () => {
    const bytes = await getThermalInventoryPDFData(seller, currency, products, taxRates, inventoryTitle, defaultNote);
    const blob = new Blob([bytes], { type: "application/pdf" }), url = URL.createObjectURL(blob);
    showBatchPrint(url);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }, [seller, currency, products, taxRates, inventoryTitle, defaultNote, showBatchPrint]);

  const shareReceipt = useCallback(async (inv) => {
    try {
      showToast("Preparing PDF...");
      const bytes = await getPDFData(inv, clients, seller, currency, taxRates);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const filename = `Billit - Professional Billing_${inv.id}.pdf`;
      const file = new File([blob], filename, { type: "application/pdf" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice ${inv.id}`,
          text: `Check attached invoice from ${seller.name}`
        });
      } else {
        const text = `Invoice ${inv.id} from ${seller.name}\nTotal: ${fmt(totalWithTax(inv.items, taxRates))}`;
        await navigator.clipboard.writeText(text);
        showToast("Summary copied to clipboard!");
      }
    } catch (e) { if (e.name !== "AbortError") showToast("Sharing failed", "error"); }
  }, [clients, seller, currency, taxRates, fmt, showToast]);

  const shareMultipleInvoices = useCallback(async (invs) => {
    showToast("Preparing PDF bundle...");
    const pdf = await getBatchPDF(invs, clients, seller, currency, taxRates);
    const filename = `Billit - Professional Billing_Bundle.pdf`;
    const file = new File([pdf.blob], filename, { type: "application/pdf" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Multiple Invoices`, text: `Check attached invoices from ${seller.name}` });
      } catch (e) { if (e.name !== "AbortError") showToast("Sharing failed", "error"); }
    } else {
      const url = URL.createObjectURL(pdf.blob);
      const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
      showToast("Download started (Share unsupported)");
    }
  }, [clients, seller, currency, taxRates, showToast]);

  const handleNewInvoice = useCallback(() => {
    setSelectedInvoice(null);
    resetForm();
    setShowModal("invoice");
  }, [resetForm]);

  const saveInvoice = useCallback(async (action = null) => {
    if (!form.clientId) return showToast("Select a client", "error");
    setIsSaving(action || "save");
    try {
      // Snapshot current tax rates into each item
      const enrichedItems = form.items.map(item => ({
        ...item,
        taxSnapshots: (item.tax || []).map(id => {
          const tr = taxRates.find(t => t.id === id);
          return tr ? { label: tr.label, rate: tr.rate } : null;
        }).filter(Boolean)
      }));

      const invTotal = totalWithTax(enrichedItems, taxRates);
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

      const formWithSnapshots = { ...form, items: enrichedItems };

      let finalInv;
      if (selectedInvoice) {
        finalInv = { ...formWithSnapshots, id: selectedInvoice.id, status: selectedInvoice.status, time: selectedInvoice.time, totalAmount: invTotal };
        setInvoices(prev => prev.map(inv => inv.id === selectedInvoice.id ? finalInv : inv));
      } else {
        const prefix = seller.invoicePrefix || "INV";
        const prefixEsc = (prefix || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^${prefixEsc}-(\\d+)`);
        const maxId = invoices.reduce((max, inv) => {
          const match = (inv.id || "").match(regex);
          if (match) {
            const num = parseInt(match[1], 10);
            return num > max ? num : max;
          }
          return max;
        }, 0);
        const newId = `${prefix}-${String(maxId + 1).padStart(3, "0")}`;
        finalInv = { ...formWithSnapshots, id: newId, status: "sent", time: time, totalAmount: invTotal };
        setInvoices(prev => [...prev, finalInv]);
      }

      if (action) {
        if (action === "share") await shareReceipt(finalInv);
        if (action === "print") await printReceipt(finalInv);
        if (action === "thermal") await printReceiptThermal(finalInv);
      }

      showToast(selectedInvoice ? "Invoice updated!" : "Invoice created!");
      setShowModal(null); setSelectedInvoice(null); resetForm();
    } catch (e) {
      console.error(e);
      showToast("Error processing invoice", "error");
    } finally {
      setIsSaving(null);
    }
  }, [form, selectedInvoice, invoices, seller.invoicePrefix, clients, downloadReceipt, shareReceipt, printReceipt, showToast, resetForm, taxRates]);

  const updateInvoiceStatus = useCallback((id, status) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
    if (selectedInvoice && selectedInvoice.id === id) setSelectedInvoice(prev => ({ ...prev, status }));
    showToast(`Status updated to ${status}`);
  }, [selectedInvoice, showToast]);

  const deleteInvoices = () => setDeleteConfirm({ type: "bulk" });

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirm || isDeleting) return;

    setIsDeleting(true);
    try {
      if (deleteConfirm.type === "bulk") {
        setInvoices(prev => prev.filter(inv => !selectedInvoices.includes(inv.id)));
        setSelectedInvoices([]);
        setIsSelectionMode(false);
        showToast("Invoices deleted");
      } else if (deleteConfirm.type === "single") {
        setInvoices(prev => prev.filter(inv => inv.id !== deleteConfirm.id));
        setShowModal(null);
        setSelectedInvoice(null);
        showToast("Invoice deleted");
      } else if (deleteConfirm.type === "product") {
        setProducts(prev => prev.filter(p => p.id !== deleteConfirm.id));
        showToast("Item deleted from inventory");
      } else if (deleteConfirm.type === "client") {
        setClients(prev => prev.filter(c => c.id !== deleteConfirm.id));
        showToast("Client deleted");
      } else if (deleteConfirm.type === "wipe") {
        showToast("Deleting data…");
        await wipeCloudState();
        clearLocalState();
        window.location.reload();
      }

      setDeleteConfirm(null);
    } catch (err) {
      console.error("Delete action failed:", err);
      showToast("Could not delete data. Please try again.", "error");
    } finally {
      setIsDeleting(false);
    }
  }, [deleteConfirm, selectedInvoices, wipeCloudState, clearLocalState, showToast, isDeleting]);

  const toggleSelection = (id) => setSelectedInvoices(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const batchUpdateStatus = (ids, newStatus) => {
    setInvoices(prev => prev.map(inv => ids.includes(inv.id) ? { ...inv, status: newStatus } : inv));
    showToast(`Updated ${ids.length} invoices to ${newStatus}`);
    setIsSelectionMode(false); setSelectedInvoices([]);
  };

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const statsMemo = useMemo(() => {
    const invs = invoices || [];
    const counts = { all: invs.length, paid: 0, sent: 0, draft: 0, overdue: 0 };
    let revenue = { total: 0, pretax: 0, tax: 0, paid: 0, paidPretax: 0, paidTax: 0, awaiting: 0, overdueAmt: 0, draftTotal: 0 };
    const taxBreakdown = {};
    const clientStats = {};
    invs.forEach(inv => {
      counts[inv.status]++;
      const sub = (inv.items || []).reduce((sum, it) => sum + (it.qty * it.price), 0);
      const itemsTaxes = (inv.items || []).reduce((acc, it) => {
        const itemTaxes = getItemTaxList(it, taxRates);
        itemTaxes.forEach(t => {
          acc.total += t.amount;
          taxBreakdown[t.label] = (taxBreakdown[t.label] || 0) + t.amount;
        });
        return acc;
      }, { total: 0 });

      const tx = itemsTaxes.total;
      const gtotal = sub + tx;
      revenue.total += gtotal; revenue.pretax += sub; revenue.tax += tx;
      if (inv.status === "paid") { revenue.paid += gtotal; revenue.paidPretax += sub; revenue.paidTax += tx; }
      else if (inv.status === "overdue") revenue.overdueAmt += gtotal;
      else if (inv.status === "draft") revenue.draftTotal += gtotal;
      else revenue.awaiting += gtotal;
      const clientId = String(inv.clientId);
      if (!clientStats[clientId]) clientStats[clientId] = 0;
      clientStats[clientId] += gtotal;
    });
    const sortedClients = Object.entries(clientStats).map(([id, amt]) => ({ ...getClient(id), amount: amt })).sort((a, b) => b.amount - a.amount);
    return { ...revenue, counts, sortedClients, taxBreakdown, pending: revenue.awaiting, overdue: revenue.overdueAmt };
  }, [invoices, taxRates, clients]);

  const saveProduct = useCallback((stayOpen = false) => {
    if (!productForm.name) return showToast("Name is required", "error");
    if (editingProductId) {
      setProducts(prev => prev.map(p => p.id === editingProductId ? { ...productForm, id: p.id } : p));
      showToast("Item updated!");
    } else {
      setProducts(prev => [...prev, { ...productForm, id: crypto.randomUUID() }]);
      showToast("Item saved to inventory!");
    }

    if (stayOpen) {
      setProductForm({ name: "", desc: "", price: 0, isDefault: false, image: null, tax: taxRates.map(t => t.id) });
      setEditingProductId(null);
    } else {
      setShowModal(null);
    }
  }, [productForm, editingProductId, showToast, taxRates]);

  const saveClient = useCallback(() => {
    if (!clientForm.name) return showToast("Name is required", "error");
    if (selectedClient) { setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...clientForm, id: c.id } : c)); showToast("Client updated!"); }
    else { setClients(prev => [...prev, { ...clientForm, id: crypto.randomUUID() }]); showToast("Client added!"); }
    setShowModal(null);
  }, [clientForm, selectedClient, showToast]);

  const downloadInventoryPDF = useCallback(async () => {
    const bytes = await getInventoryPDFData(seller, currency, products, taxRates, inventoryTitle);
    const blob = new Blob([bytes], { type: "application/pdf" }), url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `Billit - Professional Billing_Inventory.pdf`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    showToast("Inventory PDF generated!");
  }, [seller, currency, products, taxRates, showToast]);

  const printInventoryPDF = useCallback(async () => {
    showToast("Preparing Inventory for print...");
    const bytes = await getInventoryPDFData(seller, currency, products, taxRates, inventoryTitle);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const oldTitle = document.title;
    document.title = `Billit - Professional Billing_Inventory`;
    showBatchPrint(url);
    setTimeout(() => {
      document.title = oldTitle;
    }, 30000);
  }, [seller, currency, products, taxRates, showBatchPrint, showToast]);

  const shareInventoryPDF = useCallback(async () => {
    showToast("Preparing Inventory PDF...");
    try {
      const bytes = await getInventoryPDFData(seller, currency, products, taxRates, inventoryTitle);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const filename = `Billit - Professional Billing_Inventory.pdf`;
      const file = new File([blob], filename, { type: "application/pdf" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Inventory List', text: `Check our inventory list from ${seller.name}` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
        showToast("PDF Downloaded (Share unsupported)");
      }
    } catch (e) { if (e.name !== "AbortError") showToast("Sharing failed", "error"); }
  }, [seller, currency, products, showToast]);

  const handleGatedLogin = async () => {
    if (!hasAcceptedLegal) {
      setShowLegalModal(true);
      return;
    }
    sessionStorage.setItem("billit_explicit_signin", "true");
    return loginWithPopup();
  };

  const wipeAllData = () => setDeleteConfirm({ type: "wipe" });

  return (
    <Layout
      seller={seller} setTab={setTab} tab={tab} isDark={isDark} setShowModal={setShowModal}
      setShowSellerModal={setShowSellerModal}
      user={user} authLoading={authLoading}
      loginWithPopup={handleGatedLogin}
      logout={logout}
      handleNewInvoice={handleNewInvoice}
    >
      {tab === "home" && <Dashboard statsMemo={statsMemo} fmt={fmt} invoices={invoices} getClient={getClient} totalWithTax={totalWithTax} taxRates={taxRates} setSelectedInvoice={setSelectedInvoice} setShowModal={setShowModal} setTab={setTab} />}
      {tab === "bills" && <InvoiceManager invoices={invoices} filterStatus={filterStatus} setFilterStatus={setFilterStatus} search={search} setSearch={setSearch} isSelectionMode={isSelectionMode} setIsSelectionMode={setIsSelectionMode} selectedInvoices={selectedInvoices} setSelectedInvoices={setSelectedInvoices} toggleSelection={toggleSelection} deleteInvoices={deleteInvoices} batchUpdateStatus={batchUpdateStatus} downloadMultipleInvoices={downloadMultipleInvoices} printMultipleInvoices={printMultipleInvoices} printMultipleInvoicesThermal={printMultipleInvoicesThermal} shareMultipleInvoices={shareMultipleInvoices} showBatchPrint={showBatchPrint} showToast={showToast} getClient={getClient} fmt={fmt} totalWithTax={totalWithTax} taxRates={taxRates} setSelectedInvoice={setSelectedInvoice} setShowModal={setShowModal} handleNewInvoice={handleNewInvoice} />}
      {tab === "clients" && <ClientManager clients={clients} setClients={setClients} setClientForm={setClientForm} setSelectedClient={setSelectedClient} setShowModal={setShowModal} invoices={invoices} fmt={fmt} setDeleteConfirm={setDeleteConfirm} />}
      {tab === "items" && <InventoryManager inventoryTitle={inventoryTitle} editingInventoryTitle={editingInventoryTitle} setEditingInventoryTitle={setEditingInventoryTitle} setInventoryTitle={setInventoryTitle} downloadInventoryPDF={downloadInventoryPDF} printInventoryPDF={printInventoryPDF} printInventoryThermal={printInventoryThermal} shareInventoryPDF={shareInventoryPDF} setProductForm={setProductForm} setEditingProductId={setEditingProductId} setShowModal={setShowModal} products={products} setProducts={setProducts} setDeleteConfirm={setDeleteConfirm} fmt={fmt} taxRates={taxRates} itemTaxTotal={itemTaxTotal} />}
      {tab === "reports" && <Reports invoices={invoices} clients={clients} fmt={fmt} totalWithTax={totalWithTax} taxRates={taxRates} statsMemo={statsMemo} />}
      {tab === "settings" && <Settings user={user} seller={seller} setSellerForm={setSellerForm} setShowSellerModal={setShowSellerModal} authLoading={authLoading} syncStatus={syncStatus} lastSync={lastSync} invoices={invoices} clients={clients} products={products} fetchFromCloud={fetchFromCloud} logout={logout} clearLocalState={clearLocalState} signInWithPopup={handleGatedLogin} authError={authError} showToast={showToast} syncLog={syncLog} theme={theme} setTheme={setTheme} toggleTheme={toggleTheme} currency={currency} setShowCurrencyPicker={setShowCurrencyPicker} taxRates={taxRates} setTaxRates={setTaxRates} wipeAllData={wipeAllData} settingsTab={settingsTab} setSettingsTab={setSettingsTab} isDark={isDark} exportInvoicesToCSV={exportInvoicesToCSV} exportClientsToCSV={exportClientsToCSV} exportProductsToCSV={exportProductsToCSV} getClient={getClient} defaultNote={defaultNote} setDefaultNote={setDefaultNote} hasAcceptedLegal={hasAcceptedLegal} viewLegal={() => setShowLegalModal(true)} />}

      <InvoiceModal showModal={showModal} setShowModal={(val) => { setShowModal(val); if (!val) { setSelectedInvoice(null); resetForm(); } }} form={form} setForm={setForm} clients={clients} products={products} taxRates={taxRates} saveInvoice={saveInvoice} addItem={addItem} removeItem={removeItem} updateItem={updateItem} fmt={fmt} totalWithTax={totalWithTax} itemTaxTotal={itemTaxTotal} calculateBaseFromTotal={calculateBaseFromTotal} playFeedback={playFeedback} showToast={showToast} selectedInvoice={selectedInvoice} resetForm={resetForm} isSaving={isSaving} />
      <InvoiceViewModal showModal={showModal} setShowModal={setShowModal} selectedInvoice={selectedInvoice} setSelectedInvoice={setSelectedInvoice} setForm={setForm} getClient={getClient} fmt={fmt} totalWithTax={totalWithTax} itemTaxTotal={itemTaxTotal} taxRates={taxRates} downloadReceipt={downloadReceipt} printReceipt={printReceipt} printReceiptThermal={printReceiptThermal} shareReceipt={shareReceipt} setDeleteConfirm={setDeleteConfirm} updateStatus={updateInvoiceStatus} showToast={showToast} />
      <ClientModal showModal={showModal} setShowModal={setShowModal} clientForm={clientForm} setClientForm={setClientForm} selectedClient={selectedClient} saveClient={saveClient} />
      <ProductModal showModal={showModal} setShowModal={setShowModal} productForm={productForm} setProductForm={setProductForm} editingProductId={editingProductId} saveProduct={saveProduct} compressImage={compressImage} taxRates={taxRates} itemTaxTotal={itemTaxTotal} calculateBaseFromTotal={calculateBaseFromTotal} />

      <LegalModal
        show={showLegalModal}
        hasAcceptedLegal={hasAcceptedLegal}
        onAccept={() => {
          setHasAcceptedLegal(true);
          localStorage.setItem("billit_hasAcceptedLegal", "true");
          sessionStorage.setItem("billit_explicit_signin", "true");
          setShowLegalModal(false);
          showToast("Terms Accepted! You can now Sync.");
        }}
        onDecline={() => {
          setHasAcceptedLegal(false);
          localStorage.removeItem("billit_hasAcceptedLegal");
          setShowLegalModal(false);
          showToast("Consent revoked. Cloud Sync disabled.", "warning");
        }}
        onClose={() => setShowLegalModal(false)}
      />
      <SellerModal showSellerModal={showSellerModal} setShowSellerModal={setShowSellerModal} sellerForm={sellerForm} setSellerForm={setSellerForm} setSeller={setSeller} showToast={showToast} compressImage={compressImage} />

      {showCurrencyPicker && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 3000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div className="premium-card" style={{ width: "100%", maxWidth: "500px", borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px", borderBottom: "1px solid var(--border-primary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Select Currency</h3>
              <button onClick={() => setShowCurrencyPicker(false)} className="secondary-btn" style={{ padding: "8px 12px" }}>Done</button>
            </div>
            <div style={{ padding: "16px", borderBottom: "1px solid var(--border-primary)" }}>
              <input
                className="input-field"
                placeholder="Search currency..."
                value={currencySearch}
                onChange={(e) => setCurrencySearch(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
              {CURRENCIES.filter(c =>
                c.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
                c.code.toLowerCase().includes(currencySearch.toLowerCase())
              ).map(c => (
                <div
                  key={c.code}
                  onClick={() => { setCurrency(c); setShowCurrencyPicker(false); setCurrencySearch(""); }}
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: currency.code === c.code ? "var(--border-accent)" : "transparent",
                    border: `1px solid ${currency.code === c.code ? "var(--accent-primary)" : "transparent"}`,
                    marginBottom: "4px",
                    cursor: "pointer"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "bold" }}>{c.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{c.code}</div>
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: "bold", color: "var(--accent-primary)" }}>{c.symbol}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: "fixed", bottom: "110px", left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? "#ef4444" : "#4ade80", color: "#000", padding: "10px 20px", borderRadius: "10px", fontWeight: "bold", zIndex: 1000 }}>{toast.msg}</div>}

      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="premium-card" style={{ maxWidth: "340px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px" }}>Confirm Delete</h3>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "0 0 24px" }}>Are you sure? This action cannot be undone.</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteConfirm(null)} disabled={isDeleting} className="secondary-btn" style={{ flex: 1, opacity: isDeleting ? 0.65 : 1, cursor: isDeleting ? "not-allowed" : "pointer" }}>Cancel</button>
              <button onClick={confirmDelete} disabled={isDeleting} className="primary-btn" style={{ flex: 1, background: "#ef4444", opacity: isDeleting ? 0.75 : 1, cursor: isDeleting ? "not-allowed" : "pointer" }}>{isDeleting ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
