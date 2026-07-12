import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { db, functions } from "./firebase";
import { doc, getDoc, setDoc, deleteDoc, query, collection, where, orderBy, limit, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

// Hooks
import { useAuth } from "./hooks/useAuth";
import { useCloudSync } from "./hooks/useCloudSync";
import { useTheme } from "./hooks/useTheme";
import { exportInvoicesToCSV, exportClientsToCSV, exportProductsToCSV, exportFullDataJSON, importFullDataJSON } from "./lib/export";
import { sharePDF, downloadPDF as nativeDownloadPDF } from "./lib/native_actions";
import { clearProductImages, saveProductImage, deleteProductImage } from "./lib/db";

// Constants & Libs
import { initialClients, initialInvoices, statusColors, CURRENCIES, DEFAULT_SELLER } from "./lib/constants";
import { total, getItemTaxList, itemTaxTotal, totalWithTax, formatCurrency, calculateBaseFromTotal } from "./lib/calculations";
import {
  getInventoryPDFData,
  getClientListPDFData,
  getPDFData,
  getBatchPDF,
  getBatchThermalPDF,
  getThermalPDFData,
  getThermalInventoryPDFData,
  getLetterPDF
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
import { LegalModal } from "./components/LegalModal";
import { PricingModal } from "./components/PricingModal";
import { SellerModal } from "./components/SellerModal";
import { Onboarding } from "./components/Onboarding";
import { initAndroidNative } from "./lib/android_native";
import { App } from "@capacitor/app";

// Performance Utilities Outside Component
// No hexMap here, keeping it in pdf.js

const compressImage = async (dataUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let width = img.width, height = img.height, max = 300;
      if (width > height && width > max) { height *= max / width; width = max; }
      else if (height > max) { width *= max / height; height = max; }
      canvas.width = width; canvas.height = height;

      // Clear for transparency support
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      // Use webp for better compression and transparency
      resolve(canvas.toDataURL('image/webp', 0.8));
    };
    img.onerror = (err) => reject(err);
    img.src = dataUrl;
  });
};

const getLocalISODate = () => {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().split('T')[0];
};

// Sub-components
// Sub-components removed (Badge was unused)

const isNative = typeof window !== 'undefined' && 
                 typeof window.Capacitor !== 'undefined' && 
                 window.Capacitor.isNativePlatform?.() === true;

export default function BillingApp() {
  const getStorage = (key, def) => {
    try {
      const saved = localStorage.getItem("billit_" + key);
      if (!saved) return def;
      const parsed = JSON.parse(saved);
      return parsed !== null ? parsed : def;
    } catch (e) { return def; }
  };

  // 1. Refs
  const nativeRef = useRef(null);
  const isEditingRef = useRef(false);
  const isMountedRef = useRef(true);
  const audioCtxRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const onBackRef = useRef(null);
  const resetFormRef = useRef(null);

  // 2. Primitive & Status States (MUST be above callbacks that use them)
  const [appReady, setAppReady] = useState(false);
  const [tab, setTab] = useState("home");
  const [toast, setToast] = useState(null);
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(
    () => localStorage.getItem("billit_hasAcceptedLegal") === "true"
  );
  const [hapticsEnabled, setHapticsEnabled] = useState(() => getStorage("hapticsEnabled", true));
  const [soundEnabled, setSoundEnabled] = useState(() => getStorage("soundEnabled", true));
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(
    () => localStorage.getItem("billit_hasSeenOnboarding") === "true"
  );
  const [billingHistory, setBillingHistory] = useState([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  // 3. Performance Utilities & Fundamental Logic
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playFeedback = useCallback((type = "click") => {
    if (hapticsEnabled) {
      if (nativeRef.current?.vibrate) {
        nativeRef.current.vibrate(type);
      } else if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(type === "error" ? [50, 50, 50] : 10);
      }
    }

    if (soundEnabled) {
      try {
        const audioCtx = getAudioCtx();
        if (audioCtx.state === 'suspended') audioCtx.resume();
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
        osc.stop(audioCtx.currentTime + 0.1);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
      } catch (e) {
        console.warn("Billit: Audio feedback failed", e);
      }
    }
  }, [hapticsEnabled, soundEnabled, getAudioCtx]);

  const showToast = useCallback((msg, type = "success", silent = false) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ msg, type });
    if (!silent) playFeedback(type);
    const duration = type === "error" ? 5000 : 3000;
    toastTimeoutRef.current = setTimeout(() => setToast(null), duration);
  }, [playFeedback]);

  // 4. User & Auth states (Dependencies for Cloud Sync)
  const { theme, setTheme, toggleTheme, isDark } = useTheme();
  const { user, authLoading, authError, loginWithPopup, logout } = useAuth(showToast);

  const handleGatedLogin = useCallback(async () => {
    if (!hasAcceptedLegal) {
      setShowLegalModal(true);
      return false;
    }
    try {
      showToast("Signing you in securely...");
      sessionStorage.setItem("billit_explicit_signin", "true");
      const res = await loginWithPopup();
      if (res?.user) {
        showToast(`Welcome back, ${res.user.displayName || 'User'}!`, "success");
        return true;
      }
    } catch (e) {
      console.error("Login failed:", e);
      showToast("Sign-in failed. Please try again.", "error");
    }
    return false;
  }, [loginWithPopup, showToast, hasAcceptedLegal]);

  // 5. Core Data States
  const [taxRates, setTaxRates] = useState(() => {
    return getStorage("taxRates", [{ id: 1, label: "GST", rate: 18 }]);
  });
  const [currency, setCurrency] = useState(() => getStorage("currency", CURRENCIES[0]));
  const [clients, setClients] = useState(() => getStorage("clients", initialClients));
  const [products, setProducts] = useState(() => {
    const raw = getStorage("products", []);
    return raw.map(p => ({
      ...p,
      hsn: p.hsn || "",
      tax: Array.isArray(p.tax) ? p.tax : (p.tax ? [p.tax] : [])
    }));
  });
  const [seller, setSeller] = useState(() => getStorage("seller", DEFAULT_SELLER));
  const [invoices, setInvoices] = useState(() => {
    const raw = getStorage("invoices", initialInvoices);
    return raw.map(inv => ({
      ...inv,
      items: (inv.items || []).map(it => ({
        ...it,
        hsn: it.hsn || "",
        tax: Array.isArray(it.tax) ? it.tax : (it.tax ? [it.tax] : [])
      }))
    }));
  });

  // 6. Subscription/Monetization
  const [plan, setPlanState] = useState("business");
  const setPlan = useCallback((p) => {
    setPlanState(p);
  }, []);
  const [invoicesGenerated, setInvoicesGenerated] = useState(() => getStorage("invoicesGenerated", 0));
  const [billingPeriodStart, setBillingPeriodStart] = useState(() => getStorage("billingPeriodStart", new Date().toISOString()));

  // 7. Detail Configuration
  const [inventoryTitle, setInventoryTitle] = useState(() => getStorage("inventoryTitle", "Inventory List"));
  const [defaultNote, setDefaultNote] = useState(() => getStorage("defaultNote", ""));
  const [defaultClientId, setDefaultClientId] = useState(() => getStorage("defaultClientId", ""));

  // 8. Cloud Sync Section moved below after all component states are initialized


  // 9. Form State & Utilities
  const getInitialItems = useCallback(() => {
    const taxIds = (taxRates || []).map(t => t.id);
    const defaults = (products || []).filter(p => p.isDefault);
    if (defaults.length > 0) {
      return defaults.map(p => ({ id: crypto.randomUUID(), desc: p.name, qty: 1, price: p.price, hsn: p.hsn || "", tax: p.tax || taxIds }));
    }
    return [{ id: crypto.randomUUID(), desc: "", qty: 1, price: 0, hsn: "", tax: taxIds }];
  }, [products, taxRates]);

  const [form, setForm] = useState(() => {
    const defaultClient = clients.find(c => String(c.id) === String(defaultClientId));
    const initialClientId = defaultClient ? defaultClient.id : (clients[0] ? clients[0].id : (initialClients[0] || {}).id);
    return {
      clientId: String(initialClientId || ""),
      date: getLocalISODate(),
      due: getLocalISODate(),
      items: getInitialItems(),
      notes: defaultNote,
      poNumber: ""
    };
  });

  const resetForm = useCallback(() => {
    const today = getLocalISODate();
    const dueDays = parseInt(seller.defaultDueDays || 0, 10);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);
    const dueString = new Date(dueDate.getTime() - (dueDate.getTimezoneOffset() * 60 * 1000)).toISOString().split('T')[0];

    const defaultClient = clients.find(c => String(c.id) === String(defaultClientId));
    const initialClientId = defaultClient ? defaultClient.id : (clients[0] ? clients[0].id : (initialClients[0] || {}).id);

    setForm({
      clientId: String(initialClientId || ""),
      date: today,
      due: dueString,
      items: getInitialItems(),
      notes: defaultNote,
      poNumber: ""
    });
  }, [clients, getInitialItems, defaultNote, seller.defaultDueDays, defaultClientId, initialClients]);

  // 9. Specific Editor/Selection States
  const [showModal, setShowModal] = useState(null);
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isSaving, setIsSaving] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [currencySearch, setCurrencySearch] = useState("");
  const [swipeConfirmText, setSwipeConfirmText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [sellerForm, setSellerForm] = useState(seller);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({ 
    name: "", desc: "", price: 0, isDefault: false, image: null, hsn: "",
    tax: taxRates.map(t => t.id), isInclusive: false 
  });
  const [clientForm, setClientForm] = useState({ name: "", email: "", phone: "", address: "", gstin: "" });
  const [settingsTab, setSettingsTab] = useState("account");
  const [invoiceSort, setInvoiceSort] = useState("date");
  const [inventorySort, setInventorySort] = useState("name");
  const [reportRange, setReportRange] = useState("month");
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [editingInventoryTitle, setEditingInventoryTitle] = useState(false);

  // 10. Logic Effects & Helpers
  const getClient = useCallback((id) => clients.find(c => String(c.id) === String(id)) || {}, [clients]);

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => { setAppReady(true); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");
    
    if (paymentStatus === "success") {
      showToast("Payment Successful! Your plan is being updated...", "success");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === "cancel") {
      showToast("Checkout cancelled.", "warning");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [showToast]);

  const cloudSyncData = useMemo(() => ({
    invoices, clients, currency, taxRates, products, seller, inventoryTitle, defaultNote, defaultClientId, plan, invoicesGenerated, billingPeriodStart, theme
  }), [invoices, clients, currency, taxRates, products, seller, inventoryTitle, defaultNote, defaultClientId, plan, invoicesGenerated, billingPeriodStart, theme]);

  const setters = useMemo(() => ({
    setInvoices, setClients, setProducts, setSeller, setTaxRates, setCurrency, setInventoryTitle, setDefaultNote, setDefaultClientId, setTheme, setHapticsEnabled, setSoundEnabled, setHasAcceptedLegal, setPlan, setInvoicesGenerated, setBillingPeriodStart
  }), [setInvoices, setClients, setProducts, setSeller, setTaxRates, setCurrency, setInventoryTitle, setDefaultNote, setDefaultClientId, setTheme, setHapticsEnabled, setSoundEnabled, setHasAcceptedLegal, setPlan, setInvoicesGenerated, setBillingPeriodStart]);

  const {
    syncStatus, hasLoadedCloud, syncLog, lastSync, fetchFromCloud, addLog
  } = useCloudSync(user, cloudSyncData, setters, showToast, hasAcceptedLegal, isEditingRef);

  const wipeCloudState = useCallback(async () => {
    if (!user?.uid || !db) return;
    try {
      addLog("Wiping cloud storage...");
      await deleteDoc(doc(db, "users", user.uid));
    } catch (e) {
      console.error("Cloud wipe failed:", e);
      showToast("Cloud wipe failed", "error");
      throw e;
    }
  }, [user?.uid, addLog, showToast]);

  const clearLocalState = useCallback(async () => {
    addLog("Clearing local storage...");
    // Clear localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith("billit_")) {
        localStorage.removeItem(key);
      }
    });

    // Clear IndexedDB
    await clearProductImages();
    
    // Reset React state to defaults
    setInvoices(initialInvoices);
    setClients(initialClients);
    setProducts([]);
    setSeller(DEFAULT_SELLER);
    setTaxRates([{ id: 1, label: "GST", rate: 18 }]);
    setCurrency(CURRENCIES[0]);
    setPlan("free");
    setInvoicesGenerated(0);
    setBillingPeriodStart(new Date().toISOString());
    setTheme("light");
    setHasAcceptedLegal(false);
    setHasSeenOnboarding(false);
    showToast("Local data cleared");
  }, [addLog, initialInvoices, initialClients, showToast, setTheme]);


  const invoicesStatusKey = useMemo(() => {
    return invoices.map(i => `${i.id}:${i.status}:${i.due}`).join(",");
  }, [invoices]);

  useEffect(() => {
    if (!appReady || invoices.length === 0) return;
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
  }, [appReady, invoicesStatusKey, addLog]);

  const sellerRef = useRef(seller);
  const clientsRef = useRef(clients);
  useEffect(() => { sellerRef.current = seller; }, [seller]);
  useEffect(() => { clientsRef.current = clients; }, [clients]);

  useEffect(() => {
    if (clients.length > 0 && !form.clientId) {
      const defaultClient = clients.find(c => String(c.id) === String(defaultClientId));
      setForm(prev => ({ ...prev, clientId: String(defaultClient ? defaultClient.id : clients[0].id) }));
    }
  }, [clients, defaultClientId, form.clientId]);

  useEffect(() => { resetFormRef.current = resetForm; }, [resetForm]);

  // localStorage persistence hooks
  useEffect(() => { localStorage.setItem("billit_taxRates", JSON.stringify(taxRates)); }, [taxRates]);
  useEffect(() => { localStorage.setItem("billit_currency", JSON.stringify(currency)); }, [currency]);
  useEffect(() => { localStorage.setItem("billit_clients", JSON.stringify(clients)); }, [clients]);
  useEffect(() => { localStorage.setItem("billit_products", JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem("billit_seller", JSON.stringify(seller)); }, [seller]);
  useEffect(() => { localStorage.setItem("billit_invoices", JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem("billit_plan", JSON.stringify(plan)); }, [plan]);
  useEffect(() => { localStorage.setItem("billit_invoicesGenerated", JSON.stringify(invoicesGenerated)); }, [invoicesGenerated]);
  useEffect(() => { localStorage.setItem("billit_billingPeriodStart", JSON.stringify(billingPeriodStart)); }, [billingPeriodStart]);
  useEffect(() => { localStorage.setItem("billit_inventoryTitle", JSON.stringify(inventoryTitle)); }, [inventoryTitle]);
  useEffect(() => { localStorage.setItem("billit_defaultNote", JSON.stringify(defaultNote)); }, [defaultNote]);
  useEffect(() => { localStorage.setItem("billit_defaultClientId", JSON.stringify(defaultClientId)); }, [defaultClientId]);
  useEffect(() => { localStorage.setItem("billit_hapticsEnabled", JSON.stringify(hapticsEnabled)); }, [hapticsEnabled]);
  useEffect(() => { localStorage.setItem("billit_soundEnabled", JSON.stringify(soundEnabled)); }, [soundEnabled]);
  const updateItem = useCallback((index, field, value) => {
    setForm(prev => {
        const newItems = [...prev.items];
        if (typeof field === "object") {
            const sanitized = { ...field };
            if (sanitized.price !== undefined) sanitized.price = Math.max(0, Number(sanitized.price) || 0);
            if (sanitized.qty !== undefined) sanitized.qty = Math.max(0, Number(sanitized.qty) || 0);
            newItems[index] = { ...newItems[index], ...sanitized };
        } else {
            let sanctionedValue = value;
            if (field === "price" || field === "qty") {
                sanctionedValue = Math.max(0, Number(value) || 0);
            }
            newItems[index] = { ...newItems[index], [field]: sanctionedValue };
        }
        return { ...prev, items: newItems };
    });
  }, []);

  const addItem = useCallback(() => {
    setForm(prev => {
        const taxIds = (taxRates || []).map(t => t.id);
        return {
            ...prev,
            items: [...prev.items, { id: crypto.randomUUID(), desc: "", qty: 1, price: 0, hsn: "", tax: taxIds }]
        };
    });
  }, [taxRates]);


  const updateStatus = (id, status) => {
    let updateObj = { status };
    if (status === "paid") {
      updateObj.paidDate = getLocalISODate();
    }
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...updateObj } : inv));
    if (selectedInvoice && selectedInvoice.id === id) {
      setSelectedInvoice({ ...selectedInvoice, ...updateObj });
    }
    showToast(`Status updated to ${status.toUpperCase()} ${updateObj.paidDate ? "on " + updateObj.paidDate : ""}`);
  };

  const removeItem = useCallback((index) => {
    setForm(prev => {
        if (prev.items.length > 1) {
            return { ...prev, items: prev.items.filter((_, i) => i !== index) };
        }
        return {
            ...prev,
            items: [{ id: crypto.randomUUID(), desc: "", qty: 1, price: 0, tax: (taxRates || []).map(t => t.id) }]
        };
    });
  }, [taxRates]);

  const showBatchPrint = useCallback((url) => {
    // Detect mobile browsers
    const isMobileBrowser = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobileBrowser && !isNative) {
      // On mobile browsers, iframes for printing are unreliable. 
      // Opening in a new tab allows the browser's native PDF viewer to handle printing.
      const newWindow = window.open(url, '_blank');
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          showToast("Popup blocked! Please allow popups to print/preview.", "error");
      }
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    iframe.src = url;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          if (!document.body.contains(iframe)) return;
          if (!iframe.contentWindow) return;
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
  }, [showToast]);

  const downloadReceipt = useCallback(async (inv) => {
    try {
      showToast("Preparing Download...");
      setIsSaving("download");
      const bytes = await getPDFData(inv, clientsRef.current, sellerRef.current, currency, taxRates, plan);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const filename = `Billit - Professional Billing_${inv.id}.pdf`;
      await nativeDownloadPDF(blob, filename);
    } catch (e) {
      console.error(e);
      showToast("Download failed", "error");
    } finally {
      setIsSaving(null);
    }
  }, [currency, taxRates, showToast]);

  const downloadMultipleInvoices = useCallback(async (invs) => {
    try {
      showToast("Preparing PDF bundle...");
      const pdf = await getBatchPDF(invs, clientsRef.current, sellerRef.current, currency, taxRates);
      const filename = `Billit - Professional Billing_Bundle.pdf`;
      await nativeDownloadPDF(pdf.blob, filename);
    } catch (e) {
      console.error(e);
      showToast("Batch download failed", "error");
    }
  }, [currency, taxRates, showToast]);

  const printMultipleInvoices = useCallback(async (invs) => {
    showToast("Preparing PDF for print...");
    const pdf = await getBatchPDF(invs, clientsRef.current, sellerRef.current, currency, taxRates);
    const filename = `Billit-Batch-Print.pdf`;
    
    if (isNative) {
        await sharePDF(pdf.blob, filename, "Print Invoices", "Send this PDF to your printer");
    } else {
        const oldTitle = document.title;
        document.title = `Billit - Professional Billing_Bundle`;
        showBatchPrint(pdf.url);
        setTimeout(() => {
            document.title = oldTitle;
            URL.revokeObjectURL(pdf.url);
        }, 30000);
    }
  }, [currency, taxRates, showBatchPrint, showToast]);

  const printMultipleInvoicesThermal = useCallback(async (invs) => {
    showToast("Preparing Thermal PDF...");
    const pdf = await getBatchThermalPDF(invs, clientsRef.current, sellerRef.current, currency, taxRates, defaultNote);
    const filename = `Billit-Batch-Thermal.pdf`;

    if (isNative) {
        await sharePDF(pdf.blob, filename, "Thermal Print", "Send this PDF to your thermal printer");
    } else {
        showBatchPrint(pdf.url);
        setTimeout(() => URL.revokeObjectURL(pdf.url), 30030);
    }
  }, [currency, taxRates, defaultNote, showBatchPrint, showToast]);

  const printReceipt = useCallback(async (inv) => {
    try {
      showToast("Preparing Print...");
      const bytes = await getPDFData(inv, clientsRef.current, sellerRef.current, currency, taxRates, plan);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const filename = `Billit-Print-${inv.id}.pdf`;

      if (isNative) {
          await sharePDF(blob, filename, "Print Invoice", "Send this PDF to your printer");
      } else {
          const url = URL.createObjectURL(blob);
          const oldTitle = document.title;
          document.title = `Billit - Professional Billing_${inv.id}`;
          showBatchPrint(url);
          setTimeout(() => {
            document.title = oldTitle;
            URL.revokeObjectURL(url);
          }, 30000);
      }
    } catch (e) {
      console.error(e);
      showToast("Print failed", "error");
    }
  }, [currency, taxRates, plan, showBatchPrint, showToast]);

  const printReceiptThermal = useCallback(async (inv) => {
    try {
      showToast("Preparing Thermal Print...");
      const bytes = await getThermalPDFData(inv, clientsRef.current, sellerRef.current, currency, taxRates, defaultNote);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const filename = `Billit-Thermal-${inv.id}.pdf`;

      if (isNative) {
          await sharePDF(blob, filename, "Thermal Print", "Send this PDF to your thermal printer");
      } else {
          const url = URL.createObjectURL(blob);
          const oldTitle = document.title;
          document.title = `Billit - Professional Billing_${inv.id}`;
          showBatchPrint(url);
          setTimeout(() => {
            document.title = oldTitle;
            URL.revokeObjectURL(url);
          }, 30000);
      }
    } catch (e) {
      console.error(e);
      showToast("Thermal print failed", "error");
    }
  }, [currency, taxRates, defaultNote, showBatchPrint, showToast]);

  const printInventoryThermal = useCallback(async () => {
    showToast("Preparing Thermal inventory...");
    const bytes = await getThermalInventoryPDFData(sellerRef.current, currency, products, taxRates, inventoryTitle);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const filename = `Billit-Inventory-Thermal.pdf`;

    if (isNative) {
        await sharePDF(blob, filename, "Thermal Print", "Send this PDF to your thermal printer");
    } else {
        const url = URL.createObjectURL(blob);
        showBatchPrint(url);
        setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  }, [currency, products, taxRates, inventoryTitle, showBatchPrint, showToast]);

  const shareReceipt = useCallback(async (inv) => {
    try {
      showToast("Preparing Professional PDF...");
      const bytes = await getPDFData(inv, clientsRef.current, sellerRef.current, currency, taxRates, plan);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const filename = `Billit-Invoice-${inv.id}.pdf`;
      await sharePDF(blob, filename, `Invoice ${inv.id}`, `Hello! Here is your professional invoice from ${sellerRef.current.name}. Thank you!`);
    } catch (e) { if (e.name !== "AbortError") showToast("Sharing failed", "error"); }
  }, [currency, taxRates, plan, showToast]);

  const shareReceiptThermal = useCallback(async (inv) => {
    try {
      showToast("Preparing Thermal PDF...");
      const bytes = await getThermalPDFData(inv, clientsRef.current, sellerRef.current, currency, taxRates, defaultNote, plan);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const filename = `Billit-Thermal-${inv.id}.pdf`;
      await sharePDF(blob, filename, `Receipt ${inv.id}`, `Hello! Here is your quick receipt from ${sellerRef.current.name}. Thank you!`);
    } catch (e) { if (e.name !== "AbortError") showToast("Sharing failed", "error"); }
  }, [currency, taxRates, defaultNote, plan, showToast]);

  const shareMultipleInvoices = useCallback(async (invs) => {
    showToast("Preparing PDF bundle...");
    const pdf = await getBatchPDF(invs, clientsRef.current, sellerRef.current, currency, taxRates, "INVOICE", plan);
    const filename = `Billit - Professional Billing_Bundle.pdf`;
    await sharePDF(pdf.blob, filename, `Multiple Invoices`, `Check attached invoices from ${seller.name}`);
  }, [currency, taxRates, seller.name, plan, showToast]);

  const handleNewInvoice = useCallback(() => {
    setSelectedInvoice(null);
    resetForm();
    setShowModal("invoice");
  }, [resetForm]);

  const saveInvoice = useCallback(async (action = null) => {
    if (!form.clientId) return showToast("Select a client", "error");
    
    // Usage Enforcement
    if (!selectedInvoice) {
      const limit = plan === "free" ? 100 : (plan === "pro" ? 500 : Infinity);
      if (invoicesGenerated >= limit) {
        showToast(`Monthly limit reached for ${plan.toUpperCase()} plan. Please upgrade to create more invoices.`, "error");
        setShowModal("pricing"); // Will create this modal next
        return;
      }
    }

    setIsSaving(action || "save");
    try {
      // Snapshot current tax rates into each item
      const enrichedItems = form.items.map(item => ({
        ...item,
        taxSnapshots: (item.taxSnapshots && item.taxSnapshots.length > 0)
          ? item.taxSnapshots
          : (item.tax || []).map(id => {
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
        finalInv = { 
          ...formWithSnapshots, 
          id: selectedInvoice.id, 
          status: selectedInvoice.status, 
          time: selectedInvoice.time, 
          totalAmount: invTotal 
        };
        setInvoices(prev => prev.map(inv => inv.id === selectedInvoice.id ? finalInv : inv));
      } else {
        const prefix = (seller.invoicePrefix || "INV").trim();
        const prefixEsc = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^${prefixEsc}-(\\d+)`);
        const maxId = invoices.reduce((max, inv) => {
          const match = (inv.id || "").match(regex);
          if (match) {
            const num = parseInt(match[1], 10);
            return num > max ? num : max;
          }
          return max;
        }, 0);
        const newId = `${prefix}-${String(maxId + 1).padStart(3, "0")}-${Date.now().toString(36).slice(-4)}`;
        finalInv = { ...formWithSnapshots, id: newId, status: "sent", time: time, totalAmount: invTotal };
        setInvoices(prev => [finalInv, ...prev]);
        setInvoicesGenerated(prev => prev + 1);
      }
      
      try {
        if (!finalInv) throw new Error("Save aborted: invalid invoice target");
        if (action) {
          if (action === "share") await shareReceipt(finalInv);
          if (action === "print") await printReceipt(finalInv);
          if (action === "thermal") await printReceiptThermal(finalInv);
          if (action === "download") await downloadReceipt(finalInv);
        }
        showToast(selectedInvoice ? "Invoice updated!" : "Invoice created!");
        setShowModal(null); 
        setSelectedInvoice(null); 
        if (resetFormRef.current) resetFormRef.current();
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.error("Action error:", e);
          showToast("Invoice processed but external action failed", "error");
        }
      }
    } catch (e) {
      console.error(e);
      showToast("Error processing invoice", "error");
    } finally {
      setIsSaving(null);
    }
  }, [form, selectedInvoice, seller.invoicePrefix, seller.name, clients, invoices, downloadReceipt, shareReceipt, printReceipt, printReceiptThermal, showToast, resetForm, taxRates]);


  const updateInvoiceStatus = useCallback((id, status) => {
    const current = invoices.find(i => i.id === id)?.status;
    if (current === status) return;
    let updateObj = { status };
    if (status === "paid") updateObj.paidDate = getLocalISODate();
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...updateObj } : inv));
    if (selectedInvoice && selectedInvoice.id === id) setSelectedInvoice(prev => ({ ...prev, ...updateObj }));
    showToast(`Status updated to ${status.toUpperCase()} ${updateObj.paidDate ? "on " + updateObj.paidDate : ""}`);
  }, [selectedInvoice, invoices, showToast]);

  const deleteInvoices = () => {
    if (selectedInvoices.length === 0) return;
    setDeleteConfirm({ type: "bulk", count: selectedInvoices.length });
  };
  const confirmDelete = useCallback(async () => {
    if (!deleteConfirm || isDeleting) return;
    if (deleteConfirm.type === "wipe" && swipeConfirmText !== "WIPE") return;

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
        await deleteProductImage(deleteConfirm.id);
        showToast("Item deleted from inventory");
      } else if (deleteConfirm.type === "client") {
        setClients(prev => prev.filter(c => c.id !== deleteConfirm.id));
        if (String(defaultClientId) === String(deleteConfirm.id)) {
          setDefaultClientId("");
        }
        showToast("Client deleted");
      } else if (deleteConfirm.type === "wipe") {
        showToast("Deleting data…");
        try {
          await wipeCloudState();
          await clearLocalState();
          // Reset UI state even though we're reloading
          setIsDeleting(false);
          setDeleteConfirm(null);
          setSwipeConfirmText("");
          // Brief delay to ensure state update and toast are processed before reload
          setTimeout(() => window.location.reload(), 100);
          return;
        } catch (wipeErr) {
          console.error("Wipe failed:", wipeErr);
          showToast("Wipe failed. Please check connection.", "error");
        }
      }

      setDeleteConfirm(null);
      setSwipeConfirmText("");
    } catch (err) {
      console.error("Delete action failed:", err);
      showToast("Could not delete data. Please try again.", "error");
    } finally {
      setIsDeleting(false);
    }
  }, [deleteConfirm, selectedInvoices, swipeConfirmText, wipeCloudState, clearLocalState, showToast, isDeleting, defaultClientId, setDefaultClientId]);

  const toggleSelection = (id) => setSelectedInvoices(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const batchUpdateStatus = (ids, newStatus) => {
    const VALID_STATUSES = ["draft", "sent", "paid", "overdue"];
    if (!VALID_STATUSES.includes(newStatus)) return showToast("Invalid status", "error");
    setInvoices(prev => prev.map(inv => ids.includes(inv.id) ? { ...inv, status: newStatus } : inv));
    showToast(`Updated ${ids.length} invoices to ${newStatus}`);
    setIsSelectionMode(false); setSelectedInvoices([]);
  };

  const fmt = useCallback((n) => formatCurrency(n, currency), [currency]);

  // Record a partial/full payment. Additive: never alters the status enum on its own.
  // Only on full payment does status flip to 'paid'; partial stays 'sent'/'overdue' with amountPaid bumped.
  const recordPayment = useCallback((id, amount) => {
    const amt = Math.round((Number(amount) || 0) * 100) / 100;
    if (amt <= 0) return showToast("Enter a valid amount", "error");
    const inv = invoices.find(i => i.id === id);
    if (!inv) return showToast("Invoice not found", "error");
    const total = inv.totalAmount !== undefined ? inv.totalAmount : totalWithTax(inv.items, taxRates);
    const prevPaid = Math.round((Number(inv.amountPaid) || 0) * 100) / 100;
    // Never allow overpaying beyond the outstanding balance.
    const outstanding = Math.round((total - prevPaid) * 100) / 100;
    const capped = Math.min(amt, outstanding);
    if (capped <= 0) return showToast("Invoice already fully paid", "error");
    // Round the intermediate sum too, so float drift (e.g. 20 -> 20.01) never sticks.
    const newPaid = Math.round((Math.round(prevPaid * 100) + Math.round(capped * 100))) / 100;
    const updateObj = { amountPaid: newPaid };
    if (newPaid >= total) {
      updateObj.status = "paid";
      updateObj.paidDate = getLocalISODate();
    }
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, ...updateObj } : i));
    if (selectedInvoice && selectedInvoice.id === id) setSelectedInvoice(prev => ({ ...prev, ...updateObj }));
    if (updateObj.status === "paid") showToast(`Invoice fully paid (${fmt(total)})`);
    else showToast(`Recorded ${fmt(amt)} — balance ${fmt(Math.round((total - newPaid) * 100) / 100)}`);
  }, [selectedInvoice, invoices, taxRates, fmt, showToast]);

  const statsMemo = useMemo(() => {
    const invs = invoices || [];
    const counts = { all: invs.length, paid: 0, sent: 0, draft: 0, overdue: 0 };
    let revenue = { total: 0, pretax: 0, tax: 0, paid: 0, paidPretax: 0, paidTax: 0, awaiting: 0, overdueAmt: 0, draftTotal: 0 };
    const taxBreakdown = {};
    const clientStats = {};
    invs.forEach(inv => {
      counts[inv.status]++;
      // Use the stored total if available to avoid rounding drift in aggregations
      const gtotal = inv.totalAmount !== undefined ? inv.totalAmount : totalWithTax(inv.items, taxRates);
      
      // For breakdown (pre-tax/tax), we still need to sum them up, but we round each invoice's share
      const sub = (inv.items || []).reduce((sum, it) => sum + (Number(it.qty) * Number(it.price)), 0);
      const tx = gtotal - sub; // Ensure it adds up exactly to the rounded total
      
      // Update tax breakdown by labels
      (inv.items || []).forEach(it => {
        const itemTaxes = getItemTaxList(it, taxRates);
        itemTaxes.forEach(t => {
          taxBreakdown[t.label] = (taxBreakdown[t.label] || 0) + t.amount;
        });
      });

      if (inv.status !== "draft") {
          revenue.total += gtotal; 
          revenue.pretax += sub; 
          revenue.tax += tx;
      }

      const paidSoFar = Math.round((Number(inv.amountPaid) || 0) * 100) / 100;
      const outstanding = Math.round((gtotal - paidSoFar) * 100) / 100;

      if (inv.status === "paid") {
        revenue.paid += gtotal;
        revenue.paidPretax += sub;
        revenue.paidTax += tx;
      }
      else if (inv.status === "overdue") revenue.overdueAmt += outstanding;
      else if (inv.status === "draft") revenue.draftTotal += gtotal;
      else revenue.awaiting += outstanding;

      const clientId = String(inv.clientId);
      if (!clientStats[clientId]) clientStats[clientId] = 0;
      clientStats[clientId] += gtotal;
    });
    const sortedClients = Object.entries(clientStats).map(([id, amt]) => ({ ...getClient(id), ltv: amt })).sort((a, b) => b.ltv - a.ltv);
    return { ...revenue, counts, sortedClients, taxBreakdown, pending: revenue.awaiting, overdue: revenue.overdueAmt };
  }, [invoices, taxRates, clients]);

  const reportStats = useMemo(() => {
    let invs = (invoices || []);
    if (reportRange !== "all") {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        invs = invs.filter(inv => {
            const d = new Date(inv.date);
            if (reportRange === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            if (reportRange === "year") return d.getFullYear() === now.getFullYear();
            if (reportRange === "30d") return (startOfToday - d) / (1000 * 60 * 60 * 24) <= 30;
            if (reportRange === "90d") return (startOfToday - d) / (1000 * 60 * 60 * 24) <= 90;
            return true;
        });
    }

    const counts = { all: invs.length, paid: 0, sent: 0, draft: 0, overdue: 0 };
    let revenue = { total: 0, pretax: 0, tax: 0, paid: 0, paidPretax: 0, paidTax: 0, awaiting: 0, overdueAmt: 0, draftTotal: 0 };
    const taxBreakdown = {};
    const clientStats = {};
    invs.forEach(inv => {
        counts[inv.status]++;
        const gtotal = inv.totalAmount !== undefined ? inv.totalAmount : totalWithTax(inv.items, taxRates);
        const sub = (inv.items || []).reduce((sum, it) => sum + (Number(it.qty) * Number(it.price)), 0);
        const tx = gtotal - sub;

        // Update tax breakdown by labels
        (inv.items || []).forEach(it => {
            const taxes = getItemTaxList(it, taxRates);
            taxes.forEach(t => {
                taxBreakdown[t.label] = (taxBreakdown[t.label] || 0) + t.amount;
            });
        });

        revenue.total += gtotal; 
        revenue.pretax += sub; 
        revenue.tax += tx;

        const paidSoFar = Math.round((Number(inv.amountPaid) || 0) * 100) / 100;
        const outstanding = Math.round((gtotal - paidSoFar) * 100) / 100;

        if (inv.status === "paid") {
          revenue.paid += gtotal;
          revenue.paidPretax += sub;
          revenue.paidTax += tx;
        }
        else if (inv.status === "overdue") revenue.overdueAmt += outstanding;
        else if (inv.status === "draft") revenue.draftTotal += gtotal;
        else revenue.awaiting += outstanding;

        const clientId = String(inv.clientId);
        if (!clientStats[clientId]) clientStats[clientId] = 0;
        clientStats[clientId] += gtotal;
    });
    const sortedClients = Object.entries(clientStats).map(([id, amt]) => ({ ...getClient(id), ltv: amt })).sort((a, b) => b.ltv - a.ltv);
    return { ...revenue, counts, sortedClients, taxBreakdown, pending: revenue.awaiting, overdue: revenue.overdueAmt, invs };
  }, [invoices, taxRates, clients, reportRange]);

  const saveProduct = useCallback(async (stayOpen = false) => {
    if (!productForm.name) return showToast("Name is required", "error");
    
    let productId = editingProductId || crypto.randomUUID();
    let finalProduct = { ...productForm, id: productId };

    // If there's a base64 image, save to IDB and remove from state object
    if (productForm.image && productForm.image.startsWith('data:')) {
        await saveProductImage(productId, productForm.image);
        finalProduct.image = true; // Placeholder for UI to know it has image
    }

    if (editingProductId) {
      setProducts(prev => prev.map(p => p.id === editingProductId ? finalProduct : p));
      showToast("Item updated!");
    } else {
      setProducts(prev => [...prev, finalProduct]);
      showToast("Item saved to inventory!");
    }

    if (stayOpen) {
      setProductForm({ name: "", desc: "", price: 0, isDefault: false, image: null, tax: taxRates.map(t => t.id), isInclusive: false });
      setEditingProductId(null);
    } else {
      setShowModal(null);
    }
  }, [productForm, editingProductId, showToast, taxRates]);

  const saveClient = useCallback(() => {
    if (!clientForm.name?.trim()) return showToast("Name is required", "error");
    
    const trimmedForm = {
        ...clientForm,
        name: clientForm.name.trim(),
        email: clientForm.email?.trim(),
        phone: clientForm.phone?.trim(),
        address: clientForm.address?.trim(),
    };

    if (selectedClient) { 
      setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...trimmedForm, id: c.id } : c)); 
      showToast("Client updated!"); 
    }
    else { 
      const newClientId = crypto.randomUUID();
      setClients(prev => [...prev, { ...trimmedForm, id: newClientId }]); 
      if (!form.clientId) setForm(prev => ({ ...prev, clientId: newClientId }));
      showToast("Client added!"); 
    }
    setShowModal(null);
    setSelectedClient(null);
  }, [clientForm, selectedClient, showToast, form.clientId]);

  const downloadInventoryPDF = useCallback(async () => {
      const bytes = await getInventoryPDFData(seller, currency, products, taxRates, inventoryTitle, "", plan);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const filename = `Billit - Professional Billing_Inventory.pdf`;
    await nativeDownloadPDF(blob, filename);
  }, [seller, currency, products, taxRates, inventoryTitle, plan]);

  const printInventoryPDF = useCallback(async () => {
    showToast("Preparing Inventory for print...");
      const bytes = await getInventoryPDFData(seller, currency, products, taxRates, inventoryTitle, "", plan);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const filename = `Billit-Inventory.pdf`;

    if (isNative) {
        await sharePDF(blob, filename, "Print Inventory", "Send this PDF to your printer");
    } else {
        const url = URL.createObjectURL(blob);
        const oldTitle = document.title;
        document.title = `Billit - Professional Billing_Inventory`;
        showBatchPrint(url);
        setTimeout(() => {
          document.title = oldTitle;
        }, 30000);
    }
  }, [seller, currency, products, taxRates, inventoryTitle, plan, showBatchPrint, showToast]);

  const shareInventoryPDF = useCallback(async () => {
    showToast("Preparing Inventory PDF...");
    try {
        const bytes = await getInventoryPDFData(seller, currency, products, taxRates, inventoryTitle, "", plan);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const filename = `Billit - Professional Billing_Inventory.pdf`;
      await sharePDF(blob, filename, 'Inventory List', `Check our inventory list from ${seller.name}`);
    } catch (e) { if (e.name !== "AbortError") showToast("Sharing failed", "error"); }
  }, [seller, currency, products, taxRates, inventoryTitle, plan, showToast]);

  const downloadClientsPDF = useCallback(async () => {
    const filtered = clients.filter(c => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (c.name || "").toLowerCase().includes(s) || 
             (c.email || "").toLowerCase().includes(s) || 
             (c.phone || "").toLowerCase().includes(s) || 
             (c.gstin || "").toLowerCase().includes(s);
    });
      const bytes = await getClientListPDFData(seller, filtered, invoices, taxRates, currency, plan);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const filename = `Billit - Professional Billing_Clients.pdf`;
    await nativeDownloadPDF(blob, filename);
  }, [seller, clients, invoices, taxRates, currency, search, plan]);

  const handleManageSubscription = useCallback(async () => {
    if (!user) return;
    try {
      showToast("Opening billing dashboard...");
      const createPortalLink = httpsCallable(functions, "createPortalLink");
      const { data } = await createPortalLink({ returnUrl: window.location.href });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Invalid portal response");
      }
    } catch (err) {
      console.error("Portal error:", err);
      showToast(err.message || "Failed to open billing dashboard", "error");
    }
  }, [user, showToast]);

  const handleUpgrade = useCallback(async (planId) => {
    if (planId === "free" && plan !== "free") {
      // If user clicks "Free" but is on a paid plan, they should downgrade via portal
      return handleManageSubscription();
    }
    
    if (!user) {
      showToast("Please sign in to upgrade", "error");
      setShowModal(null);
      // Wait for modal to close then trigger login
      setTimeout(() => handleGatedLogin(), 300);
      return;
    }

    try {
      showToast(`Initializing Stripe for ${planId.toUpperCase()}...`);
      const createSession = httpsCallable(functions, "createCheckoutSession");
      const { data } = await createSession({
        planId,
        successUrl: window.location.origin + "?payment=success",
        cancelUrl: window.location.origin + "?payment=cancel"
      });

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Invalid session response");
      }
    } catch (err) {
      console.error("Upgrade error:", err);
      showToast(err.message || "Failed to initialize checkout", "error");
    }
  }, [user, showToast, handleGatedLogin, plan, handleManageSubscription]);

  const handleFetchBillingHistory = useCallback(async () => {
    if (!user || isFetchingHistory) return;
    setIsFetchingHistory(true);
    try {
      const q = query(
        collection(db, "billing_history"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc"),
        limit(20)
      );
      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBillingHistory(history);
    } catch (e) {
      console.error("Failed to fetch billing history:", e);
      showToast("Could not load billing history", "error");
    } finally {
      setIsFetchingHistory(false);
    }
  }, [user, isFetchingHistory, showToast]);

  const printClientsPDF = useCallback(async () => {
    showToast("Preparing Clients for print...");
    const filtered = clients.filter(c => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (c.name || "").toLowerCase().includes(s) || 
             (c.email || "").toLowerCase().includes(s) || 
             (c.phone || "").toLowerCase().includes(s) || 
             (c.gstin || "").toLowerCase().includes(s);
    });
      const bytes = await getClientListPDFData(seller, filtered, invoices, taxRates, currency, plan);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const filename = `Billit-Clients.pdf`;

    if (isNative) {
        await sharePDF(blob, filename, "Print Clients", "Send this PDF to your printer");
    } else {
        const url = URL.createObjectURL(blob);
        const oldTitle = document.title;
        document.title = `Billit - Professional Billing_Clients`;
        showBatchPrint(url);
        setTimeout(() => {
          document.title = oldTitle;
        }, 30000);
    }
  }, [seller, clients, invoices, taxRates, currency, plan, showBatchPrint, showToast, search]);

  const shareClientsPDF = useCallback(async () => {
    showToast("Preparing Clients PDF...");
    try {
      const filtered = clients.filter(c => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (c.name || "").toLowerCase().includes(s) || 
               (c.email || "").toLowerCase().includes(s) || 
               (c.phone || "").toLowerCase().includes(s) || 
               (c.gstin || "").toLowerCase().includes(s);
      });
        const bytes = await getClientListPDFData(seller, filtered, invoices, taxRates, currency, plan);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const filename = `Billit - Professional Billing_Clients.pdf`;
      await sharePDF(blob, filename, 'Client List', `Check our client list from ${seller.name}`);
    } catch (e) { if (e.name !== "AbortError") showToast("Sharing failed", "error"); }
  }, [seller, clients, invoices, taxRates, currency, plan, showToast, search]);

  const wipeAllData = () => setDeleteConfirm({ type: "wipe" });
  const hasMigratedRef = useRef(false);
  useEffect(() => {
    if (hasMigratedRef.current || !invoices || invoices.length === 0) return;
    
    let anyChanged = false;
    const updated = invoices.map(inv => {
      let invChanged = false;
      let newInv = { ...inv };

      // 1. totalAmount migration
      if (newInv.totalAmount === undefined || newInv.totalAmount === null) {
        newInv.totalAmount = totalWithTax(newInv.items, taxRates);
        invChanged = true;
      }

      // 2. taxSnapshots migration
      if (Array.isArray(newInv.items)) {
        const newItems = newInv.items.map(it => {
          if (!it.taxSnapshots || !Array.isArray(it.taxSnapshots)) {
            invChanged = true;
            return { 
              ...it, 
              taxSnapshots: getItemTaxList(it, taxRates).map(t => ({ label: t.label, rate: t.rate })) 
            };
          }
          return it;
        });
        if (invChanged) newInv.items = newItems;
      }

      if (invChanged) anyChanged = true;
      return invChanged ? newInv : inv;
    });

    if (anyChanged) {
      setInvoices(updated);
    }
    hasMigratedRef.current = true;
  }, [invoices, taxRates]);

  const handleNewClient = () => {
    setClientForm({ name: "", email: "", phone: "", address: "" });
    setSelectedClient(null);
    setShowModal("client");
  };

  const handleNewProduct = () => {
    setProductForm({ name: "", price: "", isDefault: false, tax: (taxRates || []).map(t => t.id), isInclusive: false });
    setEditingProductId(null);
    setShowModal("product");
  };

  return (
    <Layout
      seller={seller} setTab={setTab} tab={tab} isDark={isDark} setShowModal={setShowModal}
      setShowSellerModal={setShowSellerModal}
      user={user} authLoading={authLoading}
      loginWithPopup={handleGatedLogin}
      logout={logout}
      handleNewInvoice={handleNewInvoice}
      handleNewClient={handleNewClient}
      handleNewProduct={handleNewProduct}
      isNativePlatform={isNative}
      openSellerModal={() => { setSellerForm(seller); setShowSellerModal(true); }}
      search={search} setSearch={setSearch}
      plan={plan}
    >
      {tab === "home" && <Dashboard statsMemo={statsMemo} fmt={fmt} invoices={invoices} getClient={getClient} totalWithTax={totalWithTax} taxRates={taxRates} setSelectedInvoice={setSelectedInvoice} setShowModal={setShowModal} setTab={setTab} search={search} seller={seller} plan={plan} invoicesGenerated={invoicesGenerated} />}
      {tab === "bills" && (
          <InvoiceManager
            invoices={invoices}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            search={search}
            setSearch={setSearch}
            invoiceSort={invoiceSort}
            setInvoiceSort={setInvoiceSort}
            isSelectionMode={isSelectionMode}
            setIsSelectionMode={setIsSelectionMode}
            selectedInvoices={selectedInvoices}
            setSelectedInvoices={setSelectedInvoices}
            toggleSelection={toggleSelection}
            deleteInvoices={deleteInvoices}
            downloadMultipleInvoices={downloadMultipleInvoices}
            printMultipleInvoices={printMultipleInvoices}
            printMultipleInvoicesThermal={printMultipleInvoicesThermal}
            shareMultipleInvoices={shareMultipleInvoices}
            showBatchPrint={showBatchPrint}
            showToast={showToast}
            getClient={getClient}
            fmt={fmt}
            totalWithTax={totalWithTax}
            taxRates={taxRates}
            setSelectedInvoice={setSelectedInvoice}
            setShowModal={setShowModal}
            batchUpdateStatus={batchUpdateStatus}
            handleNewInvoice={handleNewInvoice}
          />
        )}
      {tab === "clients" && (
        <ClientManager
          clients={clients}
          setClients={setClients}
          setClientForm={setClientForm}
          setSelectedClient={setSelectedClient}
          setShowModal={setShowModal}
          invoices={invoices}
          fmt={fmt}
          setDeleteConfirm={setDeleteConfirm}
          totalWithTax={totalWithTax}
          taxRates={taxRates}
          search={search}
          setSearch={setSearch}
          defaultClientId={defaultClientId}
          setDefaultClientId={setDefaultClientId}
          showToast={showToast}
          downloadClientsPDF={downloadClientsPDF}
          printClientsPDF={printClientsPDF}
          shareClientsPDF={shareClientsPDF}
        />
      )}
      {tab === "items" && (
          <InventoryManager
            inventoryTitle={inventoryTitle}
            editingInventoryTitle={editingInventoryTitle}
            setEditingInventoryTitle={setEditingInventoryTitle}
            setInventoryTitle={setInventoryTitle}
            downloadInventoryPDF={downloadInventoryPDF}
            printInventoryPDF={printInventoryPDF}
            shareInventoryPDF={shareInventoryPDF}
            printInventoryThermal={printInventoryThermal}
            setProductForm={setProductForm}
            setEditingProductId={setEditingProductId}
            setShowModal={setShowModal}
            products={products}
            setProducts={setProducts}
            inventorySort={inventorySort}
            setInventorySort={setInventorySort}
            setDeleteConfirm={setDeleteConfirm}
            fmt={fmt}
            taxRates={taxRates}
            itemTaxTotal={itemTaxTotal}
            invoices={invoices}
            search={search}
            setSearch={setSearch}
          />
        )}
      {tab === "reports" && <Reports seller={seller} invoices={invoices} clients={clients} products={products} taxRates={taxRates} currency={currency} reportRange={reportRange} setReportRange={setReportRange} fmt={fmt} totalWithTax={totalWithTax} total={total} itemTaxTotal={itemTaxTotal} calculateBaseFromTotal={calculateBaseFromTotal} statsMemo={reportStats} />}
      {tab === "settings" && <Settings user={user} seller={seller} setSeller={setSeller} setSellerForm={setSellerForm} setShowSellerModal={setShowSellerModal} authLoading={authLoading} syncStatus={syncStatus} lastSync={lastSync} invoices={invoices} clients={clients} products={products} fetchFromCloud={fetchFromCloud} logout={logout} clearLocalState={clearLocalState} signInWithPopup={handleGatedLogin} authError={authError} showToast={showToast} syncLog={syncLog} theme={theme} setTheme={setTheme} toggleTheme={toggleTheme} currency={currency} setShowCurrencyPicker={setShowCurrencyPicker} taxRates={taxRates} setTaxRates={setTaxRates} wipeAllData={wipeAllData} settingsTab={settingsTab} setSettingsTab={setSettingsTab} isDark={isDark} getClient={getClient} defaultNote={defaultNote} setDefaultNote={setDefaultNote} defaultClientId={defaultClientId} setDefaultClientId={setDefaultClientId} hapticsEnabled={hapticsEnabled} setHapticsEnabled={setHapticsEnabled} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} hasAcceptedLegal={hasAcceptedLegal} viewLegal={() => setShowLegalModal(true)} plan={plan} invoicesGenerated={invoicesGenerated} billingPeriodStart={billingPeriodStart} setShowModal={setShowModal} onManageSubscription={handleManageSubscription} billingHistory={billingHistory} isFetchingHistory={isFetchingHistory} onFetchHistory={handleFetchBillingHistory} />}

      <InvoiceModal showModal={showModal} setShowModal={(val) => { setShowModal(val); if (!val) { setSelectedInvoice(null); resetForm(); } }} form={form} setForm={setForm} clients={clients} products={products} taxRates={taxRates} saveInvoice={saveInvoice} addItem={addItem} removeItem={removeItem} updateItem={updateItem} fmt={fmt} totalWithTax={totalWithTax} itemTaxTotal={itemTaxTotal} calculateBaseFromTotal={calculateBaseFromTotal} playFeedback={playFeedback} showToast={showToast} selectedInvoice={selectedInvoice} resetForm={resetForm} isSaving={isSaving} />
      <InvoiceViewModal showModal={showModal} setShowModal={setShowModal} selectedInvoice={selectedInvoice} setSelectedInvoice={setSelectedInvoice} setForm={setForm} getClient={getClient} fmt={fmt} totalWithTax={totalWithTax} itemTaxTotal={itemTaxTotal} taxRates={taxRates} downloadReceipt={downloadReceipt} printReceipt={printReceipt} printReceiptThermal={printReceiptThermal} shareReceipt={shareReceipt} shareReceiptThermal={shareReceiptThermal} setDeleteConfirm={setDeleteConfirm} updateStatus={updateInvoiceStatus} recordPayment={recordPayment} showToast={showToast} seller={seller} />
      <ClientModal showModal={showModal} setShowModal={setShowModal} clientForm={clientForm} setClientForm={setClientForm} selectedClient={selectedClient} saveClient={saveClient} setDeleteConfirm={setDeleteConfirm} />
      <ProductModal showModal={showModal} setShowModal={setShowModal} productForm={productForm} setProductForm={setProductForm} editingProductId={editingProductId} saveProduct={saveProduct} compressImage={compressImage} taxRates={taxRates} itemTaxTotal={itemTaxTotal} calculateBaseFromTotal={calculateBaseFromTotal} setDeleteConfirm={setDeleteConfirm} />

      <LegalModal
        show={showLegalModal}
        hasAcceptedLegal={hasAcceptedLegal}
        onAccept={() => {
          setHasAcceptedLegal(true);
          localStorage.setItem("billit_hasAcceptedLegal", "true");
          sessionStorage.setItem("billit_explicit_signin", "true");
          setShowLegalModal(false);
          showToast("Terms Accepted! Signing in...");
          // Wait for state to update then trigger login
          setTimeout(() => loginWithPopup(), 300);
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

      {showModal === "pricing" && (
        <PricingModal
          currentPlan={plan}
          currency={currency}
          onUpgrade={handleUpgrade}
          onClose={() => setShowModal(null)}
        />
      )}

      {!hasSeenOnboarding && (
        <Onboarding onComplete={() => {
          setHasSeenOnboarding(true);
          localStorage.setItem("billit_hasSeenOnboarding", "true");
        }} />
      )}

      {showCurrencyPicker && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 3000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div className="premium-card" style={{ width: "100%", maxWidth: "500px", borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column", paddingBottom: "calc(20px + var(--safe-area-bottom))" }}>
            <div style={{ padding: "20px", borderBottom: "1px solid var(--border-primary)", display: "flex", alignItems: "center", gap: "16px" }}>
              <button
                onClick={() => setShowCurrencyPicker(false)}
                className="secondary-btn"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-primary)",
                  cursor: "pointer",
                  padding: 0,
                  flexShrink: 0
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 style={{ margin: 0 }}>Select Currency</h3>
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

      {isSaving && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 5000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          <div className="spinner" style={{ width: "40px", height: "40px", border: "4px solid rgba(255,255,255,0.3)", borderTopColor: "var(--accent-primary)", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "16px" }} />
          <div style={{ fontWeight: "bold", fontSize: "16px" }}>
            {isSaving === "download" ? "Preparing Download..." :
             isSaving === "share" ? "Preparing Share..." :
             isSaving === "print" ? "Preparing Print..." :
             "Processing..."}
          </div>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}

      {toast && <div style={{ position: "fixed", bottom: "110px", left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? "#ef4444" : "#4ade80", color: "#000", padding: "10px 20px", borderRadius: "10px", fontWeight: "bold", zIndex: 1000 }}>{toast.msg}</div>}

      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="premium-card" style={{ maxWidth: "340px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>
              {deleteConfirm.type === "wipe" ? "💀" : "⚠️"}
            </div>
            <h3 style={{ margin: "0 0 8px" }}>
              {deleteConfirm.type === "wipe" ? "Wipe All Data" : 
               deleteConfirm.type === "bulk" ? "Delete Selection" : 
               deleteConfirm.type === "client" ? "Delete Client" :
               deleteConfirm.type === "product" ? "Delete Item" :
               "Confirm Delete"}
            </h3>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "0 0 24px" }}>
              {deleteConfirm.type === "wipe" 
                ? "This will delete all invoices, clients, and inventory both locally and from the cloud. This IS permanent." 
                : deleteConfirm.type === "product" && deleteConfirm.usedInInvoices > 0
                ? `⚠️ This item is used in ${deleteConfirm.usedInInvoices} invoice(s). Deleting it from inventory will NOT affect existing invoices, but it will be removed from suggestions.`
                : "Are you sure? This action cannot be undone."}
            </p>
            
            {deleteConfirm.type === "wipe" && (
                <input 
                  className="input-field" 
                  placeholder='Type "WIPE" to confirm'
                  value={swipeConfirmText}
                  onChange={(e) => setSwipeConfirmText(e.target.value)}
                  style={{ marginBottom: "20px", textAlign: "center", border: "1px solid #ef4444" }}
                />
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={() => { setDeleteConfirm(null); setSwipeConfirmText(""); }} 
                disabled={isDeleting} 
                className="secondary-btn" 
                style={{ flex: 1, opacity: isDeleting ? 0.65 : 1, cursor: isDeleting ? "not-allowed" : "pointer" }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                disabled={isDeleting || (deleteConfirm.type === "wipe" && swipeConfirmText !== "WIPE")} 
                className="primary-btn" 
                style={{ flex: 1, background: "#ef4444", opacity: (isDeleting || (deleteConfirm.type === "wipe" && swipeConfirmText !== "WIPE")) ? 0.75 : 1, cursor: (isDeleting || (deleteConfirm.type === "wipe" && swipeConfirmText !== "WIPE")) ? "not-allowed" : "pointer" }}
              >
                {isDeleting ? "Processing..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showModal === "invoice" && (
        <datalist id="product-suggestions">
          {products.map(p => <option key={p.id} value={p.name} />)}
        </datalist>
      )}
    </Layout>
  );
}


