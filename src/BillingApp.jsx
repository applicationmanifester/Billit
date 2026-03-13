import React, { useState, useMemo, useEffect } from "react";
import { auth, db, googleProvider } from "./firebase";
import { onAuthStateChanged, signOut, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

const initialClients = [{
  id: 1,
  name: "Customer",
  email: "customer@business.com",
  phone: "+1 000-000-0000",
  address: "123 customer St",
  info: "Default client."
}];
const initialInvoices = [];
const statusColors = {
  paid: {
    bg: "#0d2818",
    text: "#4ade80",
    border: "#166534"
  },
  sent: {
    bg: "#1e1b4b",
    text: "#818cf8",
    border: "#3730a3"
  },
  draft: {
    bg: "#1c1917",
    text: "#a8a29e",
    border: "#44403c"
  },
  overdue: {
    bg: "#2d0a0a",
    text: "#f87171",
    border: "#7f1d1d"
  }
};
const CURRENCIES = [{
  code: "USD",
  symbol: "$",
  name: "US Dollar",
  locale: "en-US"
}, {
  code: "EUR",
  symbol: "€",
  name: "Euro",
  locale: "de-DE"
}, {
  code: "GBP",
  symbol: "£",
  name: "British Pound",
  locale: "en-GB"
}, {
  code: "INR",
  symbol: "₹",
  name: "Indian Rupee",
  locale: "en-IN"
}, {
  code: "JPY",
  symbol: "¥",
  name: "Japanese Yen",
  locale: "ja-JP"
}, {
  code: "AUD",
  symbol: "A$",
  name: "Australian Dollar",
  locale: "en-AU"
}, {
  code: "CAD",
  symbol: "C$",
  name: "Canadian Dollar",
  locale: "en-CA"
}, {
  code: "AED",
  symbol: "د.إ",
  name: "UAE Dirham",
  locale: "ar-AE"
}, {
  code: "BRL",
  symbol: "R$",
  name: "Brazilian Real",
  locale: "pt-BR"
}, {
  code: "CHF",
  symbol: "Fr",
  name: "Swiss Franc",
  locale: "de-CH"
}, {
  code: "CNY",
  symbol: "¥",
  name: "Chinese Yuan",
  locale: "zh-CN"
}, {
  code: "RUB",
  symbol: "₽",
  name: "Russian Ruble",
  locale: "ru-RU"
}, {
  code: "SAR",
  symbol: "SR",
  name: "Saudi Riyal",
  locale: "ar-SA"
}, {
  code: "SGD",
  symbol: "S$",
  name: "Singapore Dollar",
  locale: "en-SG"
}, {
  code: "ZAR",
  symbol: "R",
  name: "South African Rand",
  locale: "en-ZA"
}];
const total = (items) => (items || []).reduce((s, i) => s + (i?.qty || 0) * (i?.price || 0), 0);
const getItemTaxList = (item, taxPool) => {
  const qty = item?.qty || 0;
  const price = item?.price || 0;
  const base = qty * price;
  // item.tax ids should be an array of IDs from the taxPool
  const appliedTaxIds = (Array.isArray(item?.tax) ? item.tax : [1]).map(String);
  return taxPool.filter(tr => appliedTaxIds.includes(String(tr.id))).map(tr => ({
    label: tr.label,
    rate: tr.rate,
    amount: base * (tr.rate / 100)
  }));
};
const itemTaxTotal = (item, taxPool) => getItemTaxList(item, taxPool).reduce((s, t) => s + t.amount, 0);
const totalWithTax = (items, taxPool) => (items || []).reduce((s, i) => s + (i?.qty || 0) * (i?.price || 0) + itemTaxTotal(i, taxPool), 0);

const Badge = ({ status }) => (
  <div style={{
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    background: statusColors[status]?.bg || "#333",
    color: statusColors[status]?.text || "#ccc",
    border: `1px solid ${statusColors[status]?.border || "#444"}`
  }}>
    {status}
  </div>
);

export default function BillingApp() {
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

  const getStorage = (key, def) => {
    try {
      const saved = localStorage.getItem("billit_" + key);
      if (!saved) return def;
      const parsed = JSON.parse(saved);
      return parsed !== null ? parsed : def;
    } catch (e) {
      console.error("Storage read error:", e);
      return def;
    }
  };

  const compressImage = (dataUrl, maxDim = 400, quality = 0.7) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          const s = maxDim / Math.max(w, h);
          w *= s; h *= s;
        }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(dataUrl); // Fallback to original
      img.src = dataUrl;
    });
  };

  const [invoices, setInvoices] = useState(() => getStorage("invoices", initialInvoices));
  const [clients, setClients] = useState(() => getStorage("clients", initialClients));
  const [theme, setTheme] = useState(() => getStorage("theme", "light"));
  const [currency, setCurrency] = useState(() => getStorage("currency", CURRENCIES[3])); // 3 is INR
  const [taxRates, setTaxRates] = useState(() => {
    const saved = getStorage("taxRates", [{ id: 1, label: "GST", rate: 18 }]);
    if (saved.length > 0 && !saved.some(t => t.rate === 18)) {
      return [...saved, { id: 1, label: "GST", rate: 18 }];
    }
    return saved.length === 0 ? [{ id: 1, label: "GST", rate: 18 }] : saved;
  });
  const [products, setProducts] = useState(() => getStorage("products", []));
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
  const [editingInventoryTitle, setEditingInventoryTitle] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");
  const [openItemPicker, setOpenItemPicker] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Handle redirect result
    console.log("Checking for Redirect Result...");
    getRedirectResult(auth).then((result) => {
      if (result) {
        console.log("Redirect sign-in successful:", result.user.email);
        showToast("Signed in with Google!");
      } else {
        console.log("No redirect result found (standard page load)");
      }
    }).catch((error) => {
      console.error("Redirect Error:", error.code, error.message);
      showToast(`Sign-in error: ${error.message}`, "error");
    });

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u && u.email) {
        setSeller(prev => ({ ...prev, email: u.email }));
      }
    });
    return unsub;
  }, []);

  // Cloud Sync Effect
  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, "users", user.uid);

    // Initial fetch from cloud
    getDoc(userDocRef).then(docSnap => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        console.log("Cloud data found, syncing...");
        if (cloudData.invoices && cloudData.invoices.length > 0) setInvoices(cloudData.invoices);
        if (cloudData.clients && cloudData.clients.length > 0) setClients(cloudData.clients);
        if (cloudData.products && cloudData.products.length > 0) setProducts(cloudData.products);
        if (cloudData.seller) setSeller(cloudData.seller);
        if (cloudData.taxRates) setTaxRates(cloudData.taxRates);
        if (cloudData.currency) setCurrency(cloudData.currency);
        if (cloudData.inventoryTitle) setInventoryTitle(cloudData.inventoryTitle);
      } else {
        console.log("No cloud profile found for this user. Local data will be synced up.");
      }
    }).catch(err => console.error("Cloud fetch error:", err));

    // Optional: Real-time listener for multi-device sync
    const unsub = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        // Only update if cloud data is newer or has different content (simplified)
        // For now, we mainly push updates to cloud.
      }
    });
    return unsub;
  }, [user]);

  // Combined Local & Cloud Save Effect
  useEffect(() => {
    const data = { invoices, clients, theme, currency, taxRates, products, seller, inventoryTitle };

    // Save Local
    try {
      Object.entries(data).forEach(([key, val]) => {
        localStorage.setItem("billit_" + key, JSON.stringify(val));
      });
    } catch (e) {
      if (e.name === "QuotaExceededError" || e.code === 22) {
        showToast("Storage full! Use smaller images.", "error");
      }
      console.error("Storage save error:", e);
    }

    // Save Cloud
    if (user) {
      setDoc(doc(db, "users", user.uid), data, { merge: true })
        .catch(err => console.error("Cloud sync error:", err));
    }
  }, [invoices, clients, theme, currency, taxRates, products, seller, inventoryTitle, user]);

  const [tab, setTab] = useState("home");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showModal, setShowModal] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [sellerForm, setSellerForm] = useState(seller);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({ name: "", price: 0, isDefault: false, image: null });
  const [toast, setToast] = useState(null);
  const [clientForm, setClientForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [settingsTab, setSettingsTab] = useState("app");
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'single'|'bulk', id?: string }

  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const getInitialItems = () => {
    const defaults = products.filter(p => p.isDefault);
    if (defaults.length > 0) {
      return defaults.map(p => ({ desc: p.name, qty: 1, price: p.price, tax: taxRates.map(t => t.id) }));
    }
    return [{ desc: "", qty: 1, price: 0, tax: taxRates.map(t => t.id) }];
  };

  const [form, setForm] = useState({
    clientId: initialClients[0].id,
    date: new Date().toISOString().split('T')[0],
    due: new Date().toISOString().split('T')[0],
    items: getInitialItems()
  });

  const updateItem = (index, field, value) => {
    const newItems = [...form.items];
    if (typeof field === "object") {
      newItems[index] = { ...newItems[index], ...field };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setForm({ ...form, items: newItems });
  };

  const addItem = () => {
    const defaultTaxIds = taxRates.map(t => t.id);
    setForm({ ...form, items: [...form.items, { desc: "", qty: 1, price: 0, tax: defaultTaxIds }] });
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
    }
  };

  const saveInvoice = (action = null) => {
    if (!form.clientId) return showToast("Select a client", "error");
    const prefix = seller.invoicePrefix || "INV";
    const prefixEsc = (prefix || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${prefixEsc}-(\\d+)`);

    const maxId = invoices.reduce((max, inv) => {
      const match = (inv.id || "").match(regex);
      const num = match ? parseInt(match[1], 10) : 0;
      return num > max ? num : max;
    }, 0);

    const newId = `${prefix}-${String(maxId + 1).padStart(3, "0")}`;
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    const invTotal = totalWithTax(form.items, taxRates);
    const newInv = { ...form, id: newId, status: "sent", time: time, totalAmount: invTotal };
    setInvoices(prev => [...prev, newInv]);
    // Preparation for follow-up actions
    const client = getClient(form.clientId);
    if (action === "download") downloadReceipt(newInv, client);
    if (action === "share") shareReceipt(newInv, client);
    if (action === "print") printReceipt(newInv, client);

    setShowModal(null);

    const defaultTaxIds = taxRates.map(t => t.id);
    setForm({
      clientId: initialClients[0].id,
      date: new Date().toISOString().split('T')[0],
      due: new Date().toISOString().split('T')[0],
      items: getInitialItems()
    });
    showToast("Invoice created!");
  };

  const deleteInvoices = () => {
    setDeleteConfirm({ type: "bulk" });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
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
    }
    setDeleteConfirm(null);
  };

  const toggleSelection = (id) => {
    setSelectedInvoices(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const T = {
    bg: isDark ? "#0a0a0f" : "#f4f3f0",
    text: isDark ? "#e8e3d9" : "#1a1a1a",
    textSub: isDark ? "#9e9aad" : "#656570",
    cardBg: isDark ? "#12111c" : "#ffffff",
    cardBorder: isDark ? "#2a2535" : "#e5e2da",
    inputBg: isDark ? "#1a1825" : "#f9f8f5",
    inputBorder: isDark ? "#2a2535" : "#d8d4ca",
    divider: isDark ? "#2a2535" : "#e5e2da",
    headerBg: isDark ? "linear-gradient(135deg,#0f0f1a,#1a1025)" : "#fff",
    modalBg: isDark ? "#12111c" : "#ffffff",
  };

  const fmt = (n) => {
    try {
      return new Intl.NumberFormat(currency?.locale || "en-US", {
        style: "currency",
        currency: currency?.code || "USD"
      }).format(n || 0);
    } catch (e) {
      return (currency?.symbol || "$") + (n || 0).toFixed(2);
    }
  };

  const getClient = (id) => clients.find(c => c.id === Number(id)) || {};

  const statsMemo = useMemo(() => {
    const invs = invoices || [];
    const counts = { all: invs.length, paid: 0, sent: 0, draft: 0, overdue: 0 };
    let revenue = { total: 0, pretax: 0, tax: 0, paid: 0, paidPretax: 0, paidTax: 0, awaiting: 0, overdueAmt: 0, draftTotal: 0 };
    const clientStats = {};

    invs.forEach(inv => {
      counts[inv.status]++;
      const itArr = inv.items || [];
      const sub = itArr.reduce((sum, it) => sum + (it.qty * it.price), 0);
      const tx = itArr.reduce((sum, it) => sum + itemTaxTotal(it, taxRates), 0);
      const gtotal = sub + tx;

      revenue.total += gtotal;
      revenue.pretax += sub;
      revenue.tax += tx;

      if (inv.status === "paid") {
        revenue.paid += gtotal;
        revenue.paidPretax += sub;
        revenue.paidTax += tx;
      } else if (inv.status === "overdue") {
        revenue.overdueAmt += gtotal;
      } else if (inv.status === "draft") {
        revenue.draftTotal += gtotal;
      } else {
        revenue.awaiting += gtotal;
      }

      const clientId = Number(inv.clientId);
      if (!clientStats[clientId]) clientStats[clientId] = 0;
      clientStats[clientId] += gtotal;
    });

    const sortedClients = Object.entries(clientStats)
      .map(([id, amt]) => ({ ...getClient(id), amount: amt }))
      .sort((a, b) => b.amount - a.amount);

    const avgValue = counts.all > 0 ? revenue.total / counts.all : 0;
    const collectionRate = revenue.total > 0 ? (revenue.paid / revenue.total) * 100 : 0;

    return { ...revenue, counts, sortedClients, avgValue, collectionRate, pending: revenue.awaiting, overdue: revenue.overdueAmt };
  }, [invoices, taxRates, clients]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    playFeedback(type);
    setTimeout(() => setToast(null), 3000);
  };

  const saveProduct = () => {
    if (!productForm.name) return showToast("Name is required", "error");
    if (Number(productForm.price) < 0) return showToast("Price cannot be negative", "error");
    if (editingProductId) {
      setProducts(prev => prev.map(p => p.id === editingProductId ? { ...productForm, id: p.id } : p));
      showToast("Item updated!");
    } else {
      setProducts(prev => [...prev, { ...productForm, id: Date.now() }]);
      showToast("Item saved to inventory!");
    }
    setShowModal(null);
  };

  const getInventoryPDFData = async () => {
    const biz = seller?.name || "BILLIT";
    const W = 595, H = 842, M = 40;
    const esc = (s) => String(s || "").replace(/[()\\]/g, (c) => "\\" + c);

    const curSymbol = currency?.symbol || "$";
    const isAscii = /^[\x00-\x7F]*$/.test(curSymbol);
    const pdfCur = isAscii ? curSymbol : (currency?.code || "INR");

    let objCount = 0; const objects = [];
    const addObj = (content) => {
      const data = typeof content === "string" ? new TextEncoder().encode(content) : content;
      objects.push({ num: ++objCount, data });
      return objCount;
    };

    const catID = addObj("<< /Type /Catalog /Pages 2 0 R >>");
    const pagesID = addObj(""); // Placeholder for Pages
    const f1ID = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const f2ID = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    const qrData = seller.qrCode ? await getQRImage(seller.qrCode) : null;
    const logoData = seller.logo ? await getQRImage(seller.logo) : null;

    const prodImages = await Promise.all(products.map(async p => {
      if (p.image) {
        const data = await getQRImage(p.image);
        return { id: p.id, data };
      }
      return { id: p.id, data: null };
    }));

    let lns = [];
    const txt = (t, x, y, f, s) => { lns.push("BT", `/${f} ${s} Tf`, `${x.toFixed(2)} ${y.toFixed(2)} Td`, `(${esc(t)}) Tj`, "ET"); };
    const rc = (x, y, w, h) => lns.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    const fl = () => lns.push("f"); const rg = (r, g, b) => lns.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);

    const xObjMap = {};
    if (logoData) {
      const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${logoData.w} /Height ${logoData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${logoData.hex.length} >>\nstream\n${logoData.hex}\nendstream`);
      xObjMap["ImLogo"] = id;
    }
    if (qrData) {
      const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${qrData.w} /Height ${qrData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${qrData.hex.length} >>\nstream\n${qrData.hex}\nendstream`);
      xObjMap["ImQR"] = id;
    }

    rg(0.059, 0.059, 0.098); rc(0, H - 120, W, 120); fl();
    let xLogoOffset = M;
    if (logoData) {
      const imgSize = 50;
      lns.push(`q ${imgSize} 0 0 ${imgSize} ${M} ${H - 65} cm /ImLogo Do Q`);
      xLogoOffset += 60;
    }
    rg(0.961, 0.784, 0.259); txt("INVENTORY LIST", xLogoOffset, H - 70, "F2", 24);
    rg(0.62, 0.604, 0.678); txt(biz.toUpperCase(), xLogoOffset, H - 90, "F1", 10);

    let cy = H - 180;
    rg(0.95, 0.95, 0.95); rc(M, cy - 5, W - M * 2, 20); fl();
    rg(0.2, 0.2, 0.2); txt("ITEM NAME", M + 5, cy, "F2", 9); txt("PRICE", W - M - 100, cy, "F2", 9);
    cy -= 30;

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const pImg = prodImages.find(img => img.id === p.id);
      let xOffset = M + 5;
      if (pImg && pImg.data) {
        const imgName = `ImP${i}`;
        const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${pImg.data.w} /Height ${pImg.data.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${pImg.data.hex.length} >>\nstream\n${pImg.data.hex}\nendstream`);
        xObjMap[imgName] = id;
        const imgSize = 25;
        lns.push(`q ${imgSize} 0 0 ${imgSize} ${xOffset} ${cy - 5} cm /${imgName} Do Q`);
        xOffset += 35;
      }
      rg(0.3, 0.3, 0.3); txt(p.name || "", xOffset, cy, "F1", 11);
      txt(`${pdfCur} ${Number(p.price || 0).toFixed(2)}`, W - M - 100, cy, "F2", 11);
      cy -= 35;
      if (cy < M + 100) break; // Simplified paging
    }

    if (qrData) {
      const qrSize = 120;
      const qrY = cy > M + qrSize + 20 ? cy - qrSize - 20 : M + 20;
      rg(0.95, 0.95, 0.95); rc(M, qrY, qrSize + 10, qrSize + 10); fl();
      lns.push(`q ${qrSize} 0 0 ${qrSize} ${M + 5} ${qrY + 5} cm /ImQR Do Q`);
      rg(0.4, 0.4, 0.4);
      txt("PAYMENT QR", M + qrSize + 20, qrY + 80, "F2", 12);
      txt("SCAN TO PAY", M + qrSize + 20, qrY + 60, "F1", 10);
    }

    const stream = lns.join("\n");
    const ctID = addObj(`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`);
    const xObjRes = Object.entries(xObjMap).map(([name, id]) => `/${name} ${id} 0 R`).join(" ");
    const pgID = addObj(`<< /Type /Page /Parent ${pagesID} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${ctID} 0 R /Resources << /Font << /F1 ${f1ID} 0 R /F2 ${f2ID} 0 R >> ${xObjRes ? `/XObject << ${xObjRes} >>` : ""} >> >>`);

    objects[1].data = new TextEncoder().encode(`<< /Type /Pages /Kids [${pgID} 0 R] /Count 1 >>`);

    let pdf = "%PDF-1.1\n";
    const xrefs = [];
    objects.forEach(o => { xrefs.push(pdf.length); pdf += `${o.num} 0 obj\n${new TextDecoder("utf-8").decode(o.data)}\nendobj\n`; });
    const startXref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f\n`;
    xrefs.forEach(x => { pdf += `${String(x).padStart(10, "0")} 00000 n\n`; });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catID} 0 R >>\nstartxref\n${startXref}\n%%EOF`;
    return new TextEncoder().encode(pdf);
  };

  const hexMap = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0').toUpperCase());

  const getQRImage = (dataUrl) => {
    return new Promise((resolve) => {
      if (!dataUrl) return resolve(null);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 600;
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          const s = maxDim / Math.max(w, h);
          w *= s; h *= s;
        }
        canvas.width = Math.floor(w); canvas.height = Math.floor(h);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const parts = new Array(data.length / 4 * 3);
        for (let i = 0, k = 0; i < data.length; i += 4) {
          parts[k++] = hexMap[data[i]];
          parts[k++] = hexMap[data[i + 1]];
          parts[k++] = hexMap[data[i + 2]];
        }
        resolve({ hex: parts.join('') + ">", w: canvas.width, h: canvas.height });
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  };

  const saveClient = () => {
    if (!clientForm.name) return showToast("Name is required", "error");
    if (selectedClient) {
      setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...clientForm, id: c.id } : c));
      showToast("Client updated!");
    } else {
      setClients(prev => [...prev, { ...clientForm, id: Date.now() }]);
      showToast("Client added!");
    }
    setShowModal(null);
  };

  const getInvoicePageStream = async (inv, client) => {
    const biz = seller?.name || "BILLIT";
    const W = 850, H = 1600, M = 60;
    const esc = (s) => String(s || "").replace(/[()\\]/g, (c) => "\\" + c);
    let lns = [];
    const move = (x, y) => lns.push(`${x.toFixed(2)} ${y.toFixed(2)} m`);
    const lto = (x, y) => lns.push(`${x.toFixed(2)} ${y.toFixed(2)} l`);
    const txt = (t, x, y, f, s) => { lns.push("BT", `/${f} ${s} Tf`, `${x.toFixed(2)} ${y.toFixed(2)} Td`, `(${esc(t)}) Tj`, "ET"); };
    const rc = (x, y, w, h) => lns.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    const fl = () => lns.push("f"); const rg = (r, g, b) => lns.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);

    const qrData = seller.qrCode ? await getQRImage(seller.qrCode) : null;
    const logoData = seller.logo ? await getQRImage(seller.logo) : null;

    rg(0.059, 0.059, 0.098); rc(0, H - 240, W, 240); fl();

    let xOffset = M;
    if (logoData) {
      const imgSize = 80;
      lns.push(`q ${imgSize} 0 0 ${imgSize} ${M} ${H - 120} cm /ImLogo Do Q`);
      xOffset += 100;
    }

    rg(0.961, 0.784, 0.259); txt(biz.toUpperCase(), xOffset, H - 80, "F2", 36);
    rg(0.8, 0.8, 0.8); txt(seller?.tagline || "", xOffset, H - 105, "F1", 12);
    rg(1, 1, 1);
    txt(`Email: ${seller?.email || ""}`, xOffset, H - 140, "F1", 11);
    txt(`Phone: ${seller?.phone || ""}`, xOffset, H - 155, "F1", 11);
    txt(`Address: ${seller?.address || ""}`, xOffset, H - 170, "F1", 11);
    if (seller?.gstin) txt(`Tax ID: ${seller.gstin}`, xOffset, H - 185, "F1", 11);

    rg(1, 1, 1); txt("INVOICE", W - M - 200, H - 80, "F2", 32);
    txt(`No: ${inv.id}`, W - M - 200, H - 110, "F2", 16);
    txt(`Date: ${inv.date}`, W - M - 200, H - 130, "F1", 12);
    if (inv.time) txt(`Time: ${inv.time}`, W - M - 200, H - 145, "F1", 12);
    txt(`Due: ${inv.due || inv.date}`, W - M - 200, H - 160, "F1", 12);

    rg(0, 0, 0); txt("BILL TO", M, H - 320, "F2", 14);
    rg(0.2, 0.2, 0.2); txt(client?.name || "Customer", M, H - 345, "F2", 18);
    rg(0.4, 0.4, 0.4);
    txt(client?.email || "", M, H - 365, "F1", 12);
    txt(client?.phone || "", M, H - 380, "F1", 12);
    txt(client?.address || "", M, H - 395, "F1", 12);

    let cy = H - 480;
    rg(0.95, 0.95, 0.95); rc(M, cy - 10, W - M * 2, 40); fl();
    rg(0.1, 0.1, 0.1);
    txt("DESCRIPTION", M + 10, cy + 10, "F2", 11);
    txt("QTY", M + 300, cy + 10, "F2", 11);
    txt("PRICE", M + 370, cy + 10, "F2", 11);
    txt("TAX %", M + 460, cy + 10, "F2", 11);
    txt("TAX AMT", M + 550, cy + 10, "F2", 11);
    txt("TOTAL", W - M - 100, cy + 10, "F2", 11);

    cy -= 50;
    (inv?.items || []).forEach(it => {
      const lineCost = (it.qty || 0) * (it.price || 0);
      const taxList = getItemTaxList(it, taxRates);
      const totalTaxRate = taxList.reduce((sum, t) => sum + t.rate, 0);
      const taxAmount = itemTaxTotal(it, taxRates);
      rg(0.3, 0.3, 0.3);
      txt(it.desc || "", M + 10, cy, "F1", 12);
      txt(String(it.qty || 0), M + 305, cy, "F1", 12);
      txt(fmt(it.price || 0).replace(/[^\x00-\x7F]/g, ""), M + 370, cy, "F1", 12);
      txt(`${totalTaxRate}%`, M + 465, cy, "F1", 12);
      txt(fmt(taxAmount).replace(/[^\x00-\x7F]/g, ""), M + 550, cy, "F1", 12);
      rg(0, 0, 0); txt(fmt(lineCost + taxAmount).replace(/[^\x00-\x7F]/g, ""), W - M - 100, cy, "F2", 12);
      rg(0.9, 0.9, 0.9); move(M, cy - 12); lto(W - M, cy - 12); lns.push("s");
      cy -= 35;
    });

    cy -= 40;
    const subtotal = total(inv?.items);
    const taxGrandTotal = (inv?.items || []).reduce((s, it) => s + itemTaxTotal(it, taxRates), 0);
    const grandTotal = totalWithTax(inv?.items, taxRates);

    const drawTotalLine = (label, val, y, isBold = false) => {
      rg(0.4, 0.4, 0.4); txt(label, W - M - 250, y, isBold ? "F2" : "F1", 14);
      rg(0, 0, 0); txt(val.replace(/[^\x00-\x7F]/g, ""), W - M - 100, y, isBold ? "F2" : "F1", 14);
    };

    drawTotalLine("Subtotal", fmt(subtotal), cy); cy -= 30;
    drawTotalLine("Tax Total", fmt(taxGrandTotal), cy); cy -= 40;
    const boxW = 350;
    rg(0.961, 0.784, 0.259); rc(W - M - boxW, cy - 15, boxW, 55); fl();
    rg(0, 0, 0); txt("TOTAL AMOUNT", W - M - boxW + 20, cy + 10, "F2", 16);
    txt(fmt(grandTotal).replace(/[^\x00-\x7F]/g, ""), W - M - 100, cy + 10, "F2", 18);

    if (qrData) {
      const qrSize = 350; cy -= (qrSize + 100);
      rg(0.95, 0.95, 0.95); rc(M, cy, qrSize + 20, qrSize + 20); fl();
      lns.push(`q ${qrSize} 0 0 ${qrSize} ${M + 10} ${cy + 10} cm /Im1 Do Q`);
      rg(0.4, 0.4, 0.4);
      txt("PAYMENT QR", M + qrSize + 40, cy + 200, "F2", 20);
      txt("SCAN TO PAY", M + qrSize + 40, cy + 170, "F1", 16);
    }
    return { stream: lns.join("\n"), qrData, logoData };
  };

  const getBatchPDF = async (invList) => {
    const W = 850, H = 1600;
    let objCount = 0; const objects = [];
    const addObj = (content) => {
      const data = typeof content === "string" ? new TextEncoder().encode(content) : content;
      objects.push({ num: ++objCount, data });
      return objCount;
    };

    const catID = addObj("<< /Type /Catalog /Pages 2 0 R >>"); // 1
    const pagesID = addObj(""); // 2

    const f1ID = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const f2ID = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    const pageIDs = [];
    for (let inv of invList) {
      const { stream, qrData, logoData } = await getInvoicePageStream(inv, getClient(inv.clientId));
      const xObjMap = {};
      if (qrData) {
        const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${qrData.w} /Height ${qrData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${qrData.hex.length} >>\nstream\n${qrData.hex}\nendstream`);
        xObjMap["Im1"] = id;
      }
      if (logoData) {
        const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${logoData.w} /Height ${logoData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${logoData.hex.length} >>\nstream\n${logoData.hex}\nendstream`);
        xObjMap["ImLogo"] = id;
      }

      const ctID = addObj(`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`);
      const xObjRes = Object.entries(xObjMap).map(([name, id]) => `/${name} ${id} 0 R`).join(" ");
      const pgID = addObj(`<< /Type /Page /Parent ${pagesID} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${ctID} 0 R /Resources << /Font << /F1 ${f1ID} 0 R /F2 ${f2ID} 0 R >> ${xObjRes ? `/XObject << ${xObjRes} >>` : ""} >> >>`);
      pageIDs.push(pgID);
    }

    objects[1].data = new TextEncoder().encode(`<< /Type /Pages /Kids [${pageIDs.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIDs.length} >>`);

    const enc = new TextEncoder();
    let pdfParts = [enc.encode("%PDF-1.4\n")];
    const offs = [];
    objects.forEach(o => {
      const start = pdfParts.reduce((acc, p) => acc + p.length, 0);
      offs.push(start);
      pdfParts.push(enc.encode(`${o.num} 0 obj\n`), o.data, enc.encode("\nendobj\n"));
    });
    const xOff = pdfParts.reduce((acc, p) => acc + p.length, 0);
    pdfParts.push(enc.encode(`xref\n0 ${objCount + 1}\n0000000000 65535 f \n`));
    offs.forEach(o => pdfParts.push(enc.encode(`${String(o).padStart(10, "0")} 00000 n \n`)));
    pdfParts.push(enc.encode(`trailer << /Size ${objCount + 1} /Root ${catID} 0 R >>\nstartxref\n${xOff}\n%%EOF`));

    const totalLen = pdfParts.reduce((acc, p) => acc + p.length, 0);
    const finalPdf = new Uint8Array(totalLen);
    let curIdx = 0;
    pdfParts.forEach(p => { finalPdf.set(p, curIdx); curIdx += p.length; });
    const blob = new Blob([finalPdf], { type: "application/pdf" });
    return { bytes: finalPdf, blob, url: URL.createObjectURL(blob) };
  };

  const getPDFData = async (inv, client) => {
    const pdf = await getBatchPDF([inv]);
    return pdf.bytes;
  };

  const showBatchPrint = (url) => {
    let iframe = document.getElementById("print-iframe");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "print-iframe";
      iframe.style.display = "none";
      document.body.appendChild(iframe);
    }
    iframe.src = url;
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }, 500);
    };
  };

  const shareReceipt = async (inv, client) => {
    try {
      showToast("Preparing PDF...");
      const bytes = await getPDFData(inv, client);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const file = new File([blob], `Invoice-${inv.id}.pdf`, { type: "application/pdf" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice ${inv.id}`,
          text: `Check attached invoice from ${seller.name}`
        });
      } else if (navigator.share) {
        await navigator.share({
          title: `Invoice ${inv.id}`,
          text: `Invoice ${inv.id} from ${seller.name}\nTotal: ${fmt(totalWithTax(inv.items, taxRates))}`
        });
      } else {
        const text = `Invoice ${inv.id} from ${seller.name}\nTotal: ${fmt(totalWithTax(inv.items, taxRates))}`;
        await navigator.clipboard.writeText(text);
        showToast("Summary copied to clipboard!");
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error("Share failed:", e);
        showToast("Sharing failed", "error");
      }
    }
  };

  const shareMultipleInvoices = async (invs) => {
    showToast("Preparing PDF bundle...");
    const pdf = await getBatchPDF(invs);
    const file = new File([pdf.blob], `Invoices-Bundle.pdf`, { type: "application/pdf" });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Multiple Invoices`,
          text: `Check attached invoices from ${seller.name}`
        });
      } catch (e) {
        if (e.name !== "AbortError") showToast("Sharing failed", "error");
      }
    } else {
      const url = URL.createObjectURL(pdf.blob);
      const a = document.createElement("a"); a.href = url; a.download = `Invoices-Bundle.pdf`; a.click();
      showToast("Download started (Share unsupported)");
    }
  };

  const downloadReceipt = async (inv, client) => {
    const bytes = await getPDFData(inv, client);
    const blob = new Blob([bytes], { type: "application/pdf" }), url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `Invoice-${inv.id}.pdf`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const printReceipt = async (inv, client) => {
    const bytes = await getPDFData(inv, client);
    const blob = new Blob([bytes], { type: "application/pdf" }), url = URL.createObjectURL(blob);
    showBatchPrint(url);
  };

  const downloadInventoryPDF = async () => {
    const bytes = await getInventoryPDFData();
    const blob = new Blob([bytes], { type: "application/pdf" }), url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `inventory-list.pdf`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    showToast("Inventory PDF generated!");
  };

  const shareInventoryPDF = async () => {
    showToast("Preparing Inventory PDF...");
    try {
      const bytes = await getInventoryPDFData();
      const blob = new Blob([bytes], { type: "application/pdf" });
      const file = new File([blob], "Inventory-List.pdf", { type: "application/pdf" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Inventory List',
          text: `Check out our inventory list from ${seller.name}`
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "Inventory-List.pdf"; a.click();
        showToast("PDF Downloaded (Share unsupported)");
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error("Share failed:", e);
        showToast("Sharing failed", "error");
      }
    }
  };

  const wipeAllData = () => {
    if (window.confirm("⚠️ DANGER: WIPEOUT ALL DATA?\n\nThis will permanently delete all invoices, clients, inventory, and settings stored in this app. This action CANNOT be undone.")) {
      if (window.confirm("ARE YOU ABSOLUTELY SURE?\n\nOne last check - everything will be gone.")) {
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Outfit', sans-serif",
      width: "100%", paddingBottom: "100px", paddingTop: "80px",
      position: "relative", overflowX: "hidden"
    }}>
      {/* Header */}
      <div style={{
        position: "fixed", top: 0, left: 0,
        width: "100%", zIndex: 100,
        background: T.headerBg, color: isDark ? "#fff" : "#000",
        padding: "12px 16px", borderBottom: `1px solid ${T.divider}`,
        display: "grid", gridTemplateColumns: "100px 1fr 150px", alignItems: "center",
        boxSizing: "border-box"
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
          <div style={{ background: "linear-gradient(135deg, #f5c842, #e8a020)", width: "32px", height: "32px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", color: "#000" }}>B</div>
          <h1 style={{ fontSize: "12px", fontWeight: "900", letterSpacing: "-0.2px", margin: 0, opacity: 0.9 }}>Billit</h1>
        </div>

        <div style={{ textAlign: "center", fontSize: "16px", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 10px" }}>
          {seller.name}
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={() => setTab("settings")} style={{ background: T.inputBg, border: `1px solid ${T.divider}`, borderRadius: "10px", padding: "8px", cursor: "pointer" }}>⚙️</button>
          <button style={{
            background: "linear-gradient(135deg, #f5c842, #e8a020)", border: "none", borderRadius: "12px",
            padding: "10px 14px", color: "#0a0a0f", fontWeight: "bold", fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap"
          }} onClick={() => {
            playFeedback();
            setForm({
              clientId: initialClients[0].id,
              date: new Date().toISOString().split('T')[0],
              due: new Date().toISOString().split('T')[0],
              items: getInitialItems()
            });
            setShowModal("invoice");
          }}>+ New Invoice</button>
        </div>
      </div>

      <main style={{ padding: tab === "home" || tab === "stats" ? "20px" : "0" }}>
        {tab === "home" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ background: T.cardBg, borderRadius: "16px", padding: "16px", border: `1px solid ${T.cardBorder}` }}>
                <div style={{ fontSize: "11px", color: T.textSub, textTransform: "uppercase", marginBottom: "4px" }}>Revenue</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#4ade80" }}>{fmt(statsMemo.paid)}</div>
              </div>
              <div style={{ background: T.cardBg, borderRadius: "16px", padding: "16px", border: `1px solid ${T.cardBorder}` }}>
                <div style={{ fontSize: "11px", color: T.textSub, textTransform: "uppercase", marginBottom: "4px" }}>Pending</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#818cf8" }}>{fmt(statsMemo.pending)}</div>
              </div>
              <div style={{ background: T.cardBg, borderRadius: "16px", padding: "16px", border: `1px solid ${T.cardBorder}` }}>
                <div style={{ fontSize: "11px", color: T.textSub, textTransform: "uppercase", marginBottom: "4px" }}>Overdue</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#f87171" }}>{fmt(statsMemo.overdue)}</div>
              </div>
              <div style={{ background: T.cardBg, borderRadius: "16px", padding: "16px", border: `1px solid ${T.cardBorder}` }}>
                <div style={{ fontSize: "11px", color: T.textSub, textTransform: "uppercase", marginBottom: "4px" }}>Draft</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#fbbf24" }}>{fmt(statsMemo.draftTotal)}</div>
              </div>
            </div>

            <div style={{ borderRadius: "20px", padding: "20px", margin: "16px 0", border: "1px solid #f5c84233", background: "rgba(245,200,66,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", color: T.textSub, textTransform: "uppercase" }}>Total Collected</span>
                <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "bold" }}>{statsMemo.total > 0 ? Math.round((statsMemo.paid / statsMemo.total) * 100) : 0}%</span>
              </div>
              <div style={{ fontSize: "28px", fontWeight: "bold" }}>{fmt(statsMemo.paid)} <span style={{ fontSize: "14px", color: T.textSub, fontWeight: "normal" }}>/ {fmt(statsMemo.total)}</span></div>
              <div style={{ height: "6px", background: T.divider, borderRadius: "3px", marginTop: "12px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${statsMemo.total > 0 ? (statsMemo.paid / statsMemo.total) * 100 : 0}%`, background: "#4ade80" }} />
              </div>
            </div>

            <div style={{ marginTop: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "15px" }}>Recent Invoices</h3>
                <button onClick={() => setTab("bills")} style={{ background: "none", border: "none", color: "#f5c842", fontSize: "12px", cursor: "pointer" }}>View All →</button>
              </div>
              {(invoices || []).slice(-4).reverse().map(inv => (
                <div key={inv.id} style={{ background: T.cardBg, borderRadius: "16px", padding: "16px", marginBottom: "12px", border: `1px solid ${T.cardBorder}`, cursor: "pointer" }} onClick={() => { setSelectedInvoice(inv); setShowModal("view"); }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "#f5c842", fontWeight: "bold", marginBottom: "2px" }}>{inv.id}</div>
                      <div style={{ fontSize: "15px", fontWeight: "600" }}>{getClient(inv.clientId)?.name || "Unknown"}</div>
                      <div style={{ fontSize: "11px", color: T.textSub }}>{inv.date}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "4px" }}>{fmt(totalWithTax(inv.items, taxRates))}</div>
                      <Badge status={inv.status} />
                    </div>
                  </div>
                </div>
              ))}
              {invoices.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: T.textSub }}>Start by creating your first invoice!</div>}
            </div>
          </div>
        )}

        {tab === "bills" && (
          <div style={{ paddingTop: isSelectionMode && selectedInvoices.length > 0 ? "205px" : "145px", transition: "padding 0.2s" }}>
            <div style={{ padding: "16px", position: "fixed", top: "72px", left: 0, width: "100%", background: T.bg, zIndex: 190, borderBottom: `1px solid ${T.divider}`, boxSizing: "border-box" }}>
              <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                <input style={{ flex: 1, height: "46px", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: "12px", padding: "0 16px", color: T.text, outline: "none", fontSize: "14px" }} placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <button onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedInvoices([]); }} style={{ height: "46px", background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: "12px", padding: "0 20px", color: "#f5c842", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}>{isSelectionMode ? "Cancel" : "Select"}</button>
              </div>
              <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px", justifyContent: "center" }}>
                {["all", "draft", "sent", "paid", "overdue"].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)} style={{
                    height: "32px", padding: "0 16px", borderRadius: "16px", whiteSpace: "nowrap", border: `1px solid ${filterStatus === s ? "#f5c842" : T.divider}`,
                    background: filterStatus === s ? "#f5c842" : T.cardBg, color: filterStatus === s ? "#000" : T.textSub, fontSize: "11px", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s"
                  }}>{s.toUpperCase()}</button>
                ))}
              </div>

              {isSelectionMode && selectedInvoices.length > 0 && (
                <div style={{
                  padding: "12px 0 0",
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "8px",
                  borderTop: `1px solid ${T.divider}`,
                  marginTop: "12px"
                }}>
                  <button onClick={deleteInvoices} style={{ padding: "10px 4px", borderRadius: "10px", background: "#ef4444", color: "#fff", border: "none", fontWeight: "bold", fontSize: "11px", cursor: "pointer" }}>🗑 Delete ({selectedInvoices.length})</button>
                  <button onClick={async () => {
                    const selectedInvs = invoices.filter(i => selectedInvoices.includes(i.id));
                    const pdf = await getBatchPDF(selectedInvs);
                    const a = document.createElement("a"); a.href = pdf.url; a.download = `Invoices-Bundle.pdf`; a.click();
                    showToast("Batch PDF generated!");
                  }} style={{ padding: "10px 4px", borderRadius: "10px", background: "#f5c842", color: "#000", border: "none", fontWeight: "bold", fontSize: "11px", cursor: "pointer" }}>⬇ Download PDF</button>
                  <button onClick={async () => {
                    const selectedInvs = invoices.filter(i => selectedInvoices.includes(i.id));
                    const pdf = await getBatchPDF(selectedInvs);
                    showBatchPrint(pdf.url);
                  }} style={{ padding: "10px 4px", borderRadius: "10px", background: "#f5c842", color: "#000", border: "none", fontWeight: "bold", fontSize: "11px", cursor: "pointer" }}>🖨️ Print PDF</button>
                  <button onClick={() => {
                    const selectedInvs = invoices.filter(i => selectedInvoices.includes(i.id));
                    shareMultipleInvoices(selectedInvs);
                  }} style={{ padding: "10px 4px", borderRadius: "10px", background: T.cardBg, border: `1px solid ${T.divider}`, color: "#f5c842", fontWeight: "bold", fontSize: "11px", cursor: "pointer" }}>📨 Send PDF</button>
                </div>
              )}
            </div>
            <div style={{ padding: "0 16px" }}>
              {(invoices || []).filter(i => (filterStatus === "all" || i.status === filterStatus) && (i.id.toLowerCase().includes(search.toLowerCase()) || (getClient(i.clientId)?.name || "").toLowerCase().includes(search.toLowerCase()))).slice().reverse().map(inv => (
                <div key={inv.id} style={{
                  background: T.cardBg, borderRadius: "16px", padding: "16px", marginBottom: "12px", border: `1px solid ${selectedInvoices.includes(inv.id) ? "#f5c842" : T.cardBorder}`,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "12px"
                }} onClick={() => isSelectionMode ? toggleSelection(inv.id) : (setSelectedInvoice(inv), setShowModal("view"))}>
                  {isSelectionMode && <div style={{ width: "20px", height: "20px", borderRadius: "6px", border: `2px solid ${selectedInvoices.includes(inv.id) ? "#f5c842" : T.divider}`, background: selectedInvoices.includes(inv.id) ? "#f5c842" : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>{selectedInvoices.includes(inv.id) && "✓"}</div>}
                  <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "#f5c842", fontWeight: "bold" }}>{inv.id}</div>
                      <div style={{ fontSize: "15px", fontWeight: "600" }}>{getClient(inv.clientId)?.name}</div>
                      <div style={{ fontSize: "11px", color: T.textSub }}>{inv.date}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "4px" }}>{fmt(totalWithTax(inv.items, taxRates))}</div>
                      <Badge status={inv.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "clients" && (
          <div style={{ padding: "16px" }}>
            <button onClick={() => { setClientForm({ name: "", email: "", phone: "", address: "" }); setSelectedClient(null); setShowModal("client"); }} style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "none", border: `2px dashed ${T.divider}`, color: "#f5c842", fontWeight: "bold", marginBottom: "20px" }}>+ Add New Client</button>
            {clients.map(c => (
              <div key={c.id} style={{ background: T.cardBg, borderRadius: "16px", padding: "16px", marginBottom: "12px", border: `1px solid ${T.cardBorder}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "bold" }}>{c.name}</div>
                    <div style={{ fontSize: "12px", color: T.textSub, marginTop: "2px" }}>{c.email}</div>
                    <div style={{ fontSize: "12px", color: T.textSub }}>{c.phone}</div>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => { setClientForm(c); setSelectedClient(c); setShowModal("client"); }} style={{ background: "none", border: "none", fontSize: "16px", cursor: "pointer" }}>✏️</button>
                    <button onClick={() => { if (window.confirm("Delete client?")) setClients(prev => prev.filter(cl => cl.id !== c.id)); }} style={{ background: "none", border: "none", fontSize: "16px", color: "#ef4444", cursor: "pointer" }}>🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "items" && (
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              {editingInventoryTitle ? (
                <input autoFocus onBlur={() => { setEditingInventoryTitle(false); localStorage.setItem("billit_inventoryTitle", JSON.stringify(inventoryTitle)); }} style={{ background: "none", border: "none", color: "#f5c842", fontSize: "18px", fontWeight: "bold", outline: "none", width: "100%" }} value={inventoryTitle} onChange={(e) => setInventoryTitle(e.target.value)} />
              ) : (
                <h2 onClick={() => setEditingInventoryTitle(true)} style={{ margin: 0, fontSize: "18px", color: "#f5c842" }}>{inventoryTitle} ✏️</h2>
              )}
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={downloadInventoryPDF} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: "8px", padding: "8px", color: "#f5c842", cursor: "pointer" }}>⬇️</button>
                <button onClick={shareInventoryPDF} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: "8px", padding: "8px", color: "#f5c842", cursor: "pointer" }}>📨</button>
              </div>
            </div>
            <button onClick={() => { setProductForm({ name: "", price: "", isDefault: false }); setEditingProductId(null); setShowModal("product"); }} style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "none", border: `2px dashed ${T.divider}`, color: "#f5c842", fontWeight: "bold", marginBottom: "20px" }}>+ Add to Inventory</button>
            {products.map(p => (
              <div key={p.id} style={{ background: T.cardBg, borderRadius: "16px", padding: "16px", marginBottom: "12px", border: `1px solid ${T.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "px" }}>
                  {p.image && <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#f9f8f5", overflow: "hidden", marginRight: "10px" }}><img src={p.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ fontSize: "15px", fontWeight: "bold" }}>{p.name}</div>
                      {p.isDefault && <span style={{ fontSize: "10px", background: "rgba(245,200,66,0.15)", color: "#f5c842", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>DEFAULT</span>}
                    </div>
                    <div style={{ fontSize: "14px", color: "#f5c842", fontWeight: "bold", marginTop: "2px" }}>{fmt(p.price)}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={() => { setProductForm(p); setEditingProductId(p.id); setShowModal("product"); }} style={{ background: "none", border: "none", fontSize: "16px", cursor: "pointer" }}>✏️</button>
                  <button onClick={() => { if (window.confirm("Delete item?")) setProducts(prev => prev.filter(pr => pr.id !== p.id)); }} style={{ background: "none", border: "none", fontSize: "16px", color: "#ef4444", cursor: "pointer" }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "stats" && (
          <div style={{ padding: "16px" }}>
            <div style={{ background: T.cardBg, borderRadius: "24px", padding: "24px", border: `1px solid ${T.cardBorder}`, marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", color: T.textSub, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "20px" }}>Revenue Breakdown</div>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "14px" }}>Collected</span>
                  <span style={{ fontWeight: "bold", color: "#4ade80" }}>{fmt(statsMemo.paid)}</span>
                </div>
                <div style={{ height: "6px", background: T.divider, borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#4ade80", width: `${statsMemo.collectionRate}%` }} />
                </div>
              </div>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "14px" }}>Awaiting</span>
                  <span style={{ fontWeight: "bold", color: "#818cf8" }}>{fmt(statsMemo.awaiting)}</span>
                </div>
                <div style={{ height: "6px", background: T.divider, borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#818cf8", width: `${statsMemo.total > 0 ? (statsMemo.awaiting / statsMemo.total) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "14px" }}>Overdue</span>
                  <span style={{ fontWeight: "bold", color: "#f87171" }}>{fmt(statsMemo.overdueAmt)}</span>
                </div>
                <div style={{ height: "6px", background: T.divider, borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#f87171", width: `${statsMemo.total > 0 ? (statsMemo.overdueAmt / statsMemo.total) * 100 : 0}%` }} />
                </div>
              </div>
            </div>

            <div style={{ background: T.cardBg, borderRadius: "24px", padding: "24px", border: `1px solid ${T.cardBorder}`, marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", color: T.textSub, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "20px" }}>By Client</div>
              {statsMemo.sortedClients.slice(0, 5).map((cl, idx) => (
                <div key={idx} style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "600" }}>{cl.name || "Unknown"}</span>
                    <span style={{ fontWeight: "bold", color: "#f5c842" }}>{fmt(cl.amount)}</span>
                  </div>
                  <div style={{ height: "4px", background: T.divider, borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "#f5c842", opacity: 0.6, width: `${(cl.amount / statsMemo.total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: T.cardBg, borderRadius: "24px", padding: "24px", border: `1px solid ${T.cardBorder}`, marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", color: T.textSub, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "24px" }}>Invoice Stats</div>
              {[
                { label: "Number of Invoices Present", val: statsMemo.counts.all, isMoney: false },
                { label: "Avg. Invoice Value", val: fmt(statsMemo.avgValue), isMoney: true },
                { label: "Collection Rate", val: `${Math.round(statsMemo.collectionRate)}%`, isMoney: false },
                { label: "Total Pretax Amount", val: fmt(statsMemo.pretax), isMoney: true },
                { label: "Total Taxes Amount", val: fmt(statsMemo.tax), isMoney: true },
                { label: "Total Amount", val: fmt(statsMemo.total), isMoney: true, highlight: true }
              ].map((s, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: s.highlight ? "none" : `1px solid ${T.divider}`, marginTop: s.highlight ? "12px" : 0 }}>
                  <span style={{ fontSize: "14px", color: T.textSub }}>{s.label}</span>
                  <span style={{ fontSize: s.highlight ? "18px" : "15px", fontWeight: "bold", color: s.highlight ? "#f5c842" : T.text }}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div style={{ padding: "16px" }}>
            <div style={{ background: T.cardBg, borderRadius: "20px", padding: "20px", border: `1px solid ${T.cardBorder}`, marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "50px", height: "50px", borderRadius: "15px", background: "linear-gradient(135deg, #f5c842, #e8a020)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🏢</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", fontSize: "16px" }}>{seller.name}</div>
                  <div style={{ fontSize: "12px", color: T.textSub }}>{seller.email}</div>
                </div>
                <button onClick={() => { setSellerForm(seller); setShowSellerModal(true); }} style={{ background: "none", border: "none", color: "#f5c842", fontWeight: "bold" }}>Edit</button>
              </div>
            </div>

            <div style={{ background: T.cardBg, borderRadius: "20px", padding: "20px", border: `1px solid ${T.cardBorder}`, marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "50px", height: "50px", borderRadius: "15px", background: user ? "linear-gradient(135deg, #4ade80, #22c55e)" : "linear-gradient(135deg, #9e9aad, #656570)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                  {user ? "👤" : "☁️"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", fontSize: "16px" }}>{user ? (user.displayName || user.email) : "Cloud Sync Offline"}</div>
                  <div style={{ fontSize: "12px", color: T.textSub }}>{user ? "Your data is backed up online" : "Log in to backup your data online"}</div>
                </div>
                {user ? (
                  <button onClick={() => signOut(auth).then(() => showToast("Logged out"))} style={{ background: "none", border: "none", color: "#ef4444", fontWeight: "bold" }}>Logout</button>
                ) : (
                  <button onClick={() => setSettingsTab("account")} style={{ background: "none", border: "none", color: "#f5c842", fontWeight: "bold" }}>Log In</button>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "2px", marginBottom: "16px", background: T.inputBg, padding: "2px", borderRadius: "12px", border: `1px solid ${T.divider}` }}>
              {["app", "account", "currency", "taxes"].map(st => (
                <button key={st} onClick={() => setSettingsTab(st)} style={{
                  padding: "10px", borderRadius: "10px",
                  background: settingsTab === st ? T.cardBg : "none",
                  color: settingsTab === st ? "#f5c842" : T.textSub,
                  fontSize: "11px", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s",
                  border: settingsTab === st ? `1px solid ${T.divider}` : "none"
                }}>{st.toUpperCase()}</button>
              ))}
            </div>

            {settingsTab === "account" && (
              <div style={{ background: T.cardBg, borderRadius: "20px", padding: "24px", border: `1px solid ${T.cardBorder}`, marginBottom: "20px" }}>
                {user ? (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "40px", marginBottom: "12px" }}>✅</div>
                    <div style={{ fontWeight: "bold", marginBottom: "4px" }}>You are logged in!</div>
                    <div style={{ fontSize: "13px", color: T.textSub, marginBottom: "20px" }}>All your data is securely syncing with your account: <b>{user.email}</b></div>
                    <button onClick={() => signOut(auth)} style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "none", border: `1px solid ${T.divider}`, color: "#ef4444", fontWeight: "bold" }}>Logout from Account</button>
                  </div>
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <h3 style={{ marginTop: 0 }}>Sync Account</h3>
                    <p style={{ fontSize: "14px", color: T.textSub, marginBottom: "24px" }}>Securely back up your invoices, clients, and items to the cloud.</p>
                    <button onClick={async () => {
                      showToast("Signing in with Google...");
                      console.log("Starting Google Sign-In Redirect...");
                      try {
                        await signInWithRedirect(auth, googleProvider);
                      } catch (err) {
                        console.error("Sign-In Redirect Error:", err);
                        showToast(err.message, "error");
                      }
                    }} style={{ width: "100%", padding: "16px", borderRadius: "12px", background: "#fff", border: `1px solid ${T.divider}`, color: "#000", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", cursor: "pointer", transition: "all 0.2s" }}>
                      <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" style={{ width: "20px" }} alt="Google" />
                      Sign in with Google
                    </button>
                  </div>
                )}
              </div>
            )}

            {settingsTab === "app" && (
              <div style={{ background: T.cardBg, borderRadius: "20px", overflow: "hidden", border: `1px solid ${T.cardBorder}`, marginBottom: "20px" }}>
                <div style={{ padding: "0 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", alignItems: "center" }}>
                    <div style={{ fontSize: "14px" }}>Theme Mode</div>
                    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} style={{ background: T.inputBg, border: `1px solid ${T.divider}`, borderRadius: "10px", padding: "8px 12px", fontSize: "16px", cursor: "pointer" }}>{isDark ? "🌙 Dark" : "☀️ Light"}</button>
                  </div>
                </div>
              </div>
            )}

            {settingsTab === "currency" && (
              <div style={{ background: T.cardBg, borderRadius: "20px", overflow: "hidden", border: `1px solid ${T.cardBorder}`, marginBottom: "20px" }}>
                <div style={{ padding: "16px" }}>
                  <div style={{ fontSize: "12px", color: T.textSub, marginBottom: "12px" }}>ACTIVE CURRENCY</div>
                  <div onClick={() => setShowCurrencyPicker(true)} style={{ display: "flex", justifyContent: "space-between", padding: "16px", background: T.inputBg, borderRadius: "12px", border: `1px solid ${T.divider}`, cursor: "pointer" }}>
                    <div style={{ fontSize: "15px", fontWeight: "bold" }}>{currency.name}</div>
                    <div style={{ color: "#f5c842", fontWeight: "bold" }}>{currency.code} ({currency.symbol})</div>
                  </div>
                </div>
              </div>
            )}

            {settingsTab === "taxes" && (
              <div style={{ background: T.cardBg, borderRadius: "20px", overflow: "hidden", border: `1px solid ${T.cardBorder}`, marginBottom: "20px" }}>
                <div style={{ padding: "16px" }}>
                  <div style={{ fontSize: "12px", color: T.textSub, marginBottom: "12px" }}>TAX RATES POOL</div>
                  {taxRates.map((tr, idx) => (
                    <div key={tr.id} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: idx === taxRates.length - 1 ? "none" : `1px solid ${T.divider}`, alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                        <button onClick={() => { if (taxRates.length > 1) setTaxRates(prev => prev.filter(t => t.id !== tr.id)); }} style={{ background: "none", border: "none", color: "#ef4444", fontSize: "14px", cursor: "pointer", padding: "4px" }}>✕</button>
                        <input style={{ background: "none", border: "none", color: T.text, fontSize: "14px", width: "100%", outline: "none" }} value={tr.label} onChange={(e) => setTaxRates(prev => prev.map(t => t.id === tr.id ? { ...t, label: e.target.value } : t))} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input type="number" style={{ background: T.inputBg, border: `1px solid ${T.divider}`, borderRadius: "6px", width: "50px", padding: "6px", color: T.text, textAlign: "center", fontSize: "13px" }} value={tr.rate} onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value));
                          setTaxRates(prev => prev.map(t => t.id === tr.id ? { ...t, rate: val } : t));
                        }} />
                        <span style={{ fontSize: "12px", color: T.textSub }}>%</span>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setTaxRates([...taxRates, { id: Date.now(), label: "New Tax", rate: 0 }])} style={{ width: "100%", padding: "12px", border: `1px dashed ${T.divider}`, borderRadius: "10px", background: "none", color: "#f5c842", fontSize: "13px", fontWeight: "bold", marginTop: "10px", cursor: "pointer" }}>+ Add Tax Rate</button>
                </div>
              </div>
            )}

            <div style={{ background: "rgba(239,68,68,0.05)", borderRadius: "20px", padding: "20px", border: "1px solid #ef444433" }}>
              <div style={{ fontWeight: "bold", color: "#ef4444", marginBottom: "8px" }}>Danger Zone</div>
              <button onClick={wipeAllData} style={{ width: "100%", padding: "12px", borderRadius: "10px", background: "#ef4444", border: "none", color: "#fff", fontWeight: "bold" }}>Wipe All Data</button>
            </div>

            <div style={{ marginTop: "40px", textAlign: "center", padding: "20px" }}>
              <div style={{ fontSize: "11px", color: T.textSub, marginBottom: "12px" }}>BILLIT V2.5.0 • CREATED BY APPLICATION MANIFESTER</div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button onClick={() => window.open("mailto:applicationmanifester@gmail.com")} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: "10px", padding: "8px 12px", fontSize: "12px", color: T.text }}>Send Feedback</button>
                <button onClick={() => { navigator.clipboard.writeText("applicationmanifester@gmail.com"); showToast("Email copied!"); }} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: "10px", padding: "8px 12px", fontSize: "12px", color: T.text }}>Copy Support Email</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav style={{
        position: "fixed", bottom: 0, left: 0,
        width: "100%",
        background: T.cardBg, borderTop: `1px solid ${T.cardBorder}`,
        display: "flex", justifyContent: "space-around", padding: "12px 10px",
        zIndex: 200, backdropFilter: "blur(10px)", boxSizing: "border-box"
      }}>
        {["home", "bills", "clients", "items", "stats"].map((t) => (
          <div key={t} onClick={() => { setTab(t); playFeedback(); }} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
            cursor: "pointer", opacity: tab === t ? 1 : 0.4, color: tab === t ? "#f5c842" : T.textSub,
            transition: "all 0.2s"
          }}>
            <div style={{ fontSize: "20px" }}>
              {t === "home" && "🏠"}
              {t === "bills" && "📄"}
              {t === "clients" && "👥"}
              {t === "items" && "📦"}
              {t === "stats" && "📈"}
            </div>
            <span style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase" }}>{t}</span>
          </div>
        ))}
      </nav>

      {/* Recovered Full Functional Modals */}
      {
        showModal === "invoice" && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={(e) => e.target === e.currentTarget && setShowModal(null)}>
            <div style={{ background: T.modalBg, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto", padding: "24px 20px 40px", border: `1px solid ${T.cardBorder}` }}>
              <div style={{ width: "40px", height: "4px", background: T.divider, borderRadius: "2px", margin: "0 auto 24px" }} />
              <h2 style={{ marginTop: 0, fontSize: "20px" }}>New Invoice</h2>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11px", color: T.textSub, marginBottom: "6px", textTransform: "uppercase", fontWeight: "bold" }}>Client</label>
                <select style={{ width: "100%", height: "46px", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: "12px", padding: "0 12px", color: T.text, outline: "none", fontSize: "14px" }} value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                  <option value="">Select Client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: T.textSub, marginBottom: "6px", textTransform: "uppercase", fontWeight: "bold" }}>Date</label>
                  <input type="date" style={{ width: "100%", height: "46px", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: "12px", padding: "0 12px", color: T.text, outline: "none", fontSize: "14px" }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: T.textSub, marginBottom: "6px", textTransform: "uppercase", fontWeight: "bold" }}>Due</label>
                  <input type="date" style={{ width: "100%", height: "46px", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: "12px", padding: "0 12px", color: T.text, outline: "none", fontSize: "14px" }} value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />
                </div>
              </div>
              <div style={{ fontSize: "12px", fontWeight: "bold", color: "#f5c842", marginBottom: "12px", textTransform: "uppercase" }}>Line Items</div>
              {form.items.map((it, idx) => (
                <div key={idx} style={{ background: T.inputBg, borderRadius: "12px", padding: "12px", marginBottom: "10px", border: `1px solid ${T.inputBorder}` }}>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "11px", color: "#f5c842", marginBottom: "4px", textTransform: "uppercase", fontWeight: "bold", letterSpacing: "0.5px" }}>Item Description</label>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <div style={{ flex: 1, position: "relative" }}>
                        <input style={{ width: "100%", background: "none", border: `1px solid ${T.divider}`, borderRadius: "8px", padding: "10px 35px 10px 12px", color: T.text, fontSize: "13px" }} placeholder="Item name or service..." value={it.desc} onChange={(e) => updateItem(idx, "desc", e.target.value)} />
                        <button onClick={() => setOpenItemPicker(idx)} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "16px", opacity: 0.7 }}>📦</button>
                      </div>
                      <button onClick={() => removeItem(idx)} style={{ color: "#ef4444", background: "none", border: "none", fontSize: "18px", padding: "4px", cursor: "pointer" }}>✕</button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#f5c842", marginBottom: "4px", textTransform: "uppercase", fontWeight: "bold", letterSpacing: "0.5px" }}>Quantity</label>
                      <input type="number" style={{ width: "100%", background: "none", border: `1px solid ${T.divider}`, borderRadius: "8px", padding: "10px 12px", color: T.text, fontSize: "13px" }} placeholder="1" value={it.qty} onChange={(e) => updateItem(idx, "qty", Number(e.target.value))} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#f5c842", marginBottom: "4px", textTransform: "uppercase", fontWeight: "bold", letterSpacing: "0.5px" }}>Price</label>
                      <input type="number" style={{ width: "100%", background: "none", border: `1px solid ${T.divider}`, borderRadius: "8px", padding: "10px 12px", color: T.text, fontSize: "13px" }} placeholder="0.00" value={it.price} onChange={(e) => updateItem(idx, "price", Number(e.target.value))} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#f5c842", marginBottom: "4px", textTransform: "uppercase", fontWeight: "bold", letterSpacing: "0.5px" }}>Row Total</label>
                      <div style={{ width: "100%", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "bold", color: "#4ade80" }}>
                        {fmt((it.qty || 0) * (it.price || 0) + itemTaxTotal(it, taxRates))}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: "8px" }}>
                    <label style={{ display: "block", fontSize: "10px", color: T.textSub, marginBottom: "4px" }}>APPLIED TAXES</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {taxRates.map(tr => {
                        const isSelected = Array.isArray(it.tax) && it.tax.includes(tr.id);
                        return (
                          <button key={tr.id} onClick={() => {
                            const currentTaxes = Array.isArray(it.tax) ? it.tax : [];
                            const isSelected = currentTaxes.includes(tr.id);
                            const newTaxes = isSelected ? currentTaxes.filter(id => id !== tr.id) : [...currentTaxes, tr.id];
                            updateItem(idx, "tax", newTaxes);
                          }} style={{
                            padding: "6px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "600",
                            border: `1px solid ${isSelected ? "#f5c842" : T.divider}`,
                            background: isSelected ? "rgba(245,200,66,0.1)" : "none",
                            color: isSelected ? "#f5c842" : T.textSub,
                            cursor: "pointer", transition: "all 0.2s"
                          }}>
                            {tr.label} ({tr.rate}%)
                            <div style={{ fontSize: "9px", opacity: 0.8, marginTop: "2px" }}>
                              + {fmt((it.qty || 0) * (it.price || 0) * (tr.rate / 100))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addItem} style={{ width: "100%", padding: "10px", borderRadius: "10px", border: `1px dashed ${T.divider}`, background: "none", color: "#f5c842", fontSize: "13px", fontWeight: "bold", marginBottom: "20px" }}>+ Add Line Item</button>
              <div style={{ padding: "16px", background: "rgba(245,200,66,0.05)", borderRadius: "14px", display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                <span style={{ color: T.textSub }}>Total Due</span>
                <span style={{ fontSize: "20px", fontWeight: "bold", color: "#f5c842" }}>{fmt(totalWithTax(form.items, taxRates))}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px", position: "sticky", bottom: "0", background: T.modalBg, paddingBottom: "10px", zIndex: 10 }}>
                <button onClick={() => saveInvoice("download")} style={{ padding: "12px 8px", borderRadius: "12px", border: `1px solid ${T.divider}`, background: T.cardBg, color: T.text, fontWeight: "bold", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer", fontSize: "11px" }}>
                  <span style={{ fontSize: "16px" }}>⬇️</span>
                  <span>PDF</span>
                </button>
                <button onClick={() => saveInvoice("share")} style={{ padding: "12px 8px", borderRadius: "12px", border: `1px solid ${T.divider}`, background: T.cardBg, color: T.text, fontWeight: "bold", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer", fontSize: "11px" }}>
                  <span style={{ fontSize: "16px" }}>📨</span>
                  <span>Send PDF</span>
                </button>
                <button onClick={() => saveInvoice("print")} style={{ padding: "12px 8px", borderRadius: "12px", border: `1px solid ${T.divider}`, background: T.cardBg, color: T.text, fontWeight: "bold", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer", fontSize: "11px" }}>
                  <span style={{ fontSize: "16px" }}>🖨️</span>
                  <span>Print</span>
                </button>
              </div>
              <button onClick={() => saveInvoice()} style={{ width: "100%", height: "54px", background: "linear-gradient(135deg, #f5c842, #e8a020)", border: "none", borderRadius: "14px", fontWeight: "bold", color: "#000", fontSize: "16px", cursor: "pointer", boxShadow: "0 4px 15px rgba(245,200,66,0.2)" }}>Create Invoice</button>
            </div>
          </div>
        )
      }

      {
        showModal === "view" && selectedInvoice && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={(e) => e.target === e.currentTarget && setShowModal(null)}>
            <div style={{ background: T.modalBg, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto", padding: "24px 20px 40px", border: `1px solid ${T.cardBorder}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#f5c842" }}>{selectedInvoice.id}</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold" }}>{getClient(selectedInvoice.clientId)?.name}</div>
                  <div style={{ fontSize: "12px", color: T.textSub }}>{selectedInvoice.date}</div>
                </div>
                <Badge status={selectedInvoice.status} />
              </div>
              <div style={{ background: T.inputBg, borderRadius: "16px", padding: "16px", marginBottom: "20px" }}>
                {(selectedInvoice.items || []).map((it, i) => {
                  const taxList = getItemTaxList(it, taxRates);
                  return (
                    <div key={i} style={{ padding: "12px 0", borderBottom: i < selectedInvoice.items.length - 1 ? `1px solid ${T.divider}` : "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: "600" }}>{it.desc}</div>
                          <div style={{ fontSize: "11px", color: T.textSub }}>{it.qty} × {fmt(it.price)}</div>
                        </div>
                        <div style={{ fontWeight: "bold" }}>{fmt((it.qty * it.price) + itemTaxTotal(it, taxRates))}</div>
                      </div>
                      {taxList.map((tx, ti) => (
                        <div key={ti} style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: T.textSub, opacity: 0.8 }}>
                          <span>{tx.label} ({tx.rate}%)</span>
                          <span>+ {fmt(tx.amount)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              <div style={{ background: "rgba(245,200,66,0.08)", borderRadius: "14px", padding: "16px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "14px" }}>
                  <span style={{ color: T.textSub }}>Subtotal</span>
                  <span>{fmt(total(selectedInvoice.items))}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "14px" }}>
                  <span style={{ color: T.textSub }}>Tax collected</span>
                  <span style={{ color: "#f87171" }}>+ {fmt((selectedInvoice.items || []).reduce((s, it) => s + itemTaxTotal(it, taxRates), 0))}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${T.divider}`, paddingTop: "12px" }}>
                  <span style={{ fontWeight: "600" }}>Total Amount</span>
                  <span style={{ fontSize: "20px", fontWeight: "bold", color: "#f5c842" }}>{fmt(totalWithTax(selectedInvoice.items, taxRates))}</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px", position: "sticky", bottom: "0", background: T.modalBg, paddingBottom: "10px", zIndex: 10 }}>
                <button onClick={() => downloadReceipt(selectedInvoice, getClient(selectedInvoice.clientId))} style={{ padding: "14px", borderRadius: "12px", border: "none", background: "#f5c842", color: "#000", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer" }}>⬇ PDF</button>
                <button onClick={() => shareReceipt(selectedInvoice, getClient(selectedInvoice.clientId))} style={{ padding: "14px", borderRadius: "12px", border: `1px solid ${T.divider}`, background: "none", color: "#f5c842", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer" }}>📨 Send PDF</button>
                <button onClick={() => printReceipt(selectedInvoice, getClient(selectedInvoice.clientId))} style={{ padding: "14px", borderRadius: "12px", border: `1px solid ${T.divider}`, background: "none", color: T.text, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer" }}>🖨 Print</button>
              </div>
              {seller.qrCode && (
                <div style={{ textAlign: "center", marginBottom: "20px", padding: "16px", background: T.inputBg, borderRadius: "16px", border: `1px solid ${T.divider}` }}>
                  <div style={{ fontSize: "12px", color: T.textSub, marginBottom: "8px" }}>PAYMENT QR CODE</div>
                  <div style={{ background: "#fff", padding: "10px", display: "inline-block", borderRadius: "12px" }}>
                    <img src={seller.qrCode} style={{ width: "120px", height: "120px", display: "block" }} />
                  </div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", marginBottom: "20px", background: T.inputBg, padding: "6px", borderRadius: "16px", border: `1px solid ${T.divider}` }}>
                <button onClick={() => updateStatus(selectedInvoice.id, "draft")} style={{ height: "40px", borderRadius: "10px", background: selectedInvoice.status === "draft" ? T.cardBg : "none", color: selectedInvoice.status === "draft" ? "#f5c842" : T.textSub, fontSize: "11px", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s", border: selectedInvoice.status === "draft" ? `1px solid ${T.divider}` : "none" }}>DRAFT</button>
                <button onClick={() => updateStatus(selectedInvoice.id, "sent")} style={{ height: "40px", borderRadius: "10px", background: selectedInvoice.status === "sent" ? "rgba(129,140,248,0.15)" : "none", color: selectedInvoice.status === "sent" ? "#818cf8" : T.textSub, fontSize: "11px", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s", border: selectedInvoice.status === "sent" ? `1px solid rgba(129,140,248,0.3)` : "none" }}>SENT</button>
                <button onClick={() => updateStatus(selectedInvoice.id, "paid")} style={{ height: "40px", borderRadius: "10px", background: selectedInvoice.status === "paid" ? "rgba(74,222,128,0.15)" : "none", color: selectedInvoice.status === "paid" ? "#4ade80" : T.textSub, fontSize: "11px", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s", border: selectedInvoice.status === "paid" ? `1px solid rgba(74,222,128,0.3)` : "none" }}>PAID</button>
                <button onClick={() => updateStatus(selectedInvoice.id, "overdue")} style={{ height: "40px", borderRadius: "10px", background: selectedInvoice.status === "overdue" ? "rgba(248,113,113,0.15)" : "none", color: selectedInvoice.status === "overdue" ? "#f87171" : T.textSub, fontSize: "11px", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s", border: selectedInvoice.status === "overdue" ? `1px solid rgba(248,113,113,0.3)` : "none" }}>OVERDUE</button>
              </div>
              <button onClick={() => {
                console.log("Delete button clicked for modal");
                setDeleteConfirm({ type: "single", id: selectedInvoice.id });
              }} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: `1px solid rgba(248,113,113,0.2)`, background: "rgba(248,113,113,0.05)", color: "#f87171", fontWeight: "bold", cursor: "pointer" }}>🗑 Delete Invoice</button>
            </div>
          </div>
        )
      }

      {
        showModal === "client" && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={(e) => e.target === e.currentTarget && setShowModal(null)}>
            <div style={{ background: T.modalBg, borderRadius: "24px", width: "100%", maxWidth: "400px", padding: "24px", border: `1px solid ${T.cardBorder}` }}>
              <h3 style={{ marginTop: 0 }}>{selectedClient ? "Edit Client" : "New Client"}</h3>
              {[{ l: "Name", k: "name" }, { l: "Email", k: "email" }, { l: "Phone", k: "phone" }, { l: "Address", k: "address" }].map(f => (
                <div key={f.k} style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "11px", color: T.textSub, marginBottom: "6px", textTransform: "uppercase", fontWeight: "bold" }}>{f.l}</label>
                  <input style={{ width: "100%", height: "46px", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: "12px", padding: "0 12px", color: T.text, outline: "none", fontSize: "14px" }} value={clientForm[f.k]} onChange={(e) => setClientForm({ ...clientForm, [f.k]: e.target.value })} />
                </div>
              ))}
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setShowModal(null)} style={{ flex: 1, padding: "12px", border: `1px solid ${T.divider}`, background: "none", color: T.textSub, borderRadius: "10px" }}>Cancel</button>
                <button onClick={saveClient} style={{ flex: 1, padding: "12px", border: "none", background: "#f5c842", color: "#000", borderRadius: "10px", fontWeight: "bold" }}>Save</button>
              </div>
            </div>
          </div>
        )
      }

      {
        showModal === "product" && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={(e) => e.target === e.currentTarget && setShowModal(null)}>
            <div style={{ background: T.modalBg, borderRadius: "24px", width: "100%", maxWidth: "400px", padding: "24px", border: `1px solid ${T.cardBorder}` }}>
              <h3 style={{ marginTop: 0 }}>{editingProductId ? "Edit Item" : "Add Item"}</h3>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11px", color: T.textSub, marginBottom: "6px", textTransform: "uppercase", fontWeight: "bold" }}>Item Name</label>
                <input style={{ width: "100%", height: "46px", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: "12px", padding: "0 12px", color: T.text, outline: "none", fontSize: "14px" }} value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "11px", color: T.textSub, marginBottom: "6px", textTransform: "uppercase", fontWeight: "bold" }}>Price</label>
                <input type="number" min="0" style={{ width: "100%", height: "46px", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: "12px", padding: "0 12px", color: T.text, outline: "none", fontSize: "14px" }} value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: Math.max(0, Number(e.target.value)) })} />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "11px", color: T.textSub, marginBottom: "8px", textTransform: "uppercase", fontWeight: "bold" }}>Item Image</label>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <label style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "rgba(245,200,66,0.1)", color: "#f5c842", border: "1px dashed #f5c842", textAlign: "center", cursor: "pointer", fontSize: "13px" }}>
                    {productForm.image ? "Change Image" : "Upload Image"}
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const compressed = await compressImage(reader.result);
                          setProductForm({ ...productForm, image: compressed });
                        };
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                  {productForm.image && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#f9f8f5", overflow: "hidden", border: `1px solid ${T.divider}` }}>
                        <img src={productForm.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <button
                        onClick={() => setProductForm({ ...productForm, image: null })}
                        style={{ padding: "8px", borderRadius: "8px", background: "rgba(255, 68, 68, 0.1)", color: "#ff4444", border: "none", cursor: "pointer", fontSize: "12px" }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px", cursor: "pointer" }} onClick={() => setProductForm({ ...productForm, isDefault: !productForm.isDefault })}>
                <div style={{ width: "20px", height: "20px", borderRadius: "6px", border: `2px solid ${productForm.isDefault ? "#f5c842" : T.divider}`, display: "flex", alignItems: "center", justifyContent: "center", background: productForm.isDefault ? "#f5c842" : "none" }}>
                  {productForm.isDefault && <span style={{ color: "#000", fontSize: "14px" }}>✓</span>}
                </div>
                <span style={{ fontSize: "14px", color: T.text }}>Set as Default (Auto-add to new invoices)</span>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setShowModal(null)} style={{ flex: 1, padding: "12px", border: `1px solid ${T.divider}`, background: "none", color: T.textSub, borderRadius: "10px" }}>Cancel</button>
                <button onClick={saveProduct} style={{ flex: 1, padding: "12px", border: "none", background: "#f5c842", color: "#000", borderRadius: "10px", fontWeight: "bold" }}>Save</button>
              </div>
            </div>
          </div>
        )
      }

      {
        showSellerModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(5px)" }}>
            <div style={{ background: T.cardBg, padding: "24px", borderRadius: "24px", width: "100%", maxWidth: "420px", border: `1px solid ${T.cardBorder}`, maxHeight: "90vh", overflowY: "auto" }}>
              <h3 style={{ marginTop: 0, fontSize: "20px" }}>Profile Details</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div><label style={{ fontSize: "12px", color: T.textSub, marginBottom: "8px", display: "block" }}>Biz Name</label>
                  <input style={{ width: "100%", padding: "14px", borderRadius: "12px", background: T.inputBg, border: `1px solid ${T.divider}`, color: T.text }} value={sellerForm.name} onChange={e => setSellerForm({ ...sellerForm, name: e.target.value })} placeholder="Business Name" /></div>
                <div><label style={{ fontSize: "12px", color: T.textSub, marginBottom: "8px", display: "block" }}>Tagline</label>
                  <input style={{ width: "100%", padding: "14px", borderRadius: "12px", background: T.inputBg, border: `1px solid ${T.divider}`, color: T.text }} value={sellerForm.tagline} onChange={e => setSellerForm({ ...sellerForm, tagline: e.target.value })} placeholder="Professional Billing" /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div><label style={{ fontSize: "12px", color: T.textSub, marginBottom: "8px", display: "block" }}>Email</label>
                    <input style={{ width: "100%", padding: "14px", borderRadius: "12px", background: T.inputBg, border: `1px solid ${T.divider}`, color: T.text }} value={sellerForm.email} onChange={e => setSellerForm({ ...sellerForm, email: e.target.value })} placeholder="biz@example.com" /></div>
                  <div><label style={{ fontSize: "12px", color: T.textSub, marginBottom: "8px", display: "block" }}>Phone</label>
                    <input style={{ width: "100%", padding: "14px", borderRadius: "12px", background: T.inputBg, border: `1px solid ${T.divider}`, color: T.text }} value={sellerForm.phone} onChange={e => setSellerForm({ ...sellerForm, phone: e.target.value })} placeholder="+1 000-000-0000" /></div>
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: T.textSub, marginBottom: "8px", display: "block" }}>Business Logo</label>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <label style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "rgba(245,200,66,0.1)", color: "#f5c842", border: "1px dashed #f5c842", textAlign: "center", cursor: "pointer", fontSize: "13px" }}>
                      {sellerForm.logo ? "Change Logo" : "Upload Logo"}
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const compressed = await compressImage(reader.result);
                            setSellerForm({ ...sellerForm, logo: compressed });
                          };
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                    {sellerForm.logo && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "6px", background: "#fff", overflow: "hidden", border: `1px solid ${T.divider}` }}>
                          <img src={sellerForm.logo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                        <button
                          onClick={() => setSellerForm({ ...sellerForm, logo: null })}
                          style={{ padding: "8px", borderRadius: "8px", background: "rgba(255, 68, 68, 0.1)", color: "#ff4444", border: "none", cursor: "pointer", fontSize: "12px" }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div><label style={{ fontSize: "12px", color: T.textSub, marginBottom: "8px", display: "block" }}>Address</label>
                  <input style={{ width: "100%", padding: "14px", borderRadius: "12px", background: T.inputBg, border: `1px solid ${T.divider}`, color: T.text }} value={sellerForm.address} onChange={e => setSellerForm({ ...sellerForm, address: e.target.value })} placeholder="123 Street" /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div><label style={{ fontSize: "12px", color: T.textSub, marginBottom: "8px", display: "block" }}>Tax ID / GSTIN</label>
                    <input style={{ width: "100%", padding: "14px", borderRadius: "12px", background: T.inputBg, border: `1px solid ${T.divider}`, color: T.text }} value={sellerForm.gstin} onChange={e => setSellerForm({ ...sellerForm, gstin: e.target.value })} placeholder="GSTIN" /></div>
                  <div><label style={{ fontSize: "12px", color: T.textSub, marginBottom: "8px", display: "block" }}>INV Prefix</label>
                    <input style={{ width: "100%", padding: "14px", borderRadius: "12px", background: T.inputBg, border: `1px solid ${T.divider}`, color: T.text }} value={sellerForm.invoicePrefix || ""} onChange={e => setSellerForm({ ...sellerForm, invoicePrefix: e.target.value.toUpperCase() })} placeholder="INV" /></div>
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: T.textSub, marginBottom: "8px", display: "block" }}>Payment QR Code</label>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <label style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "rgba(245,200,66,0.1)", color: "#f5c842", border: "1px dashed #f5c842", textAlign: "center", cursor: "pointer", fontSize: "13px" }}>
                      {sellerForm.qrCode ? "Change QR Code" : "Upload QR Code"}
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const compressed = await compressImage(reader.result);
                            setSellerForm({ ...sellerForm, qrCode: compressed });
                          };
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                    {sellerForm.qrCode && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "6px", background: "#fff", overflow: "hidden", border: `1px solid ${T.divider}` }}>
                          <img src={sellerForm.qrCode} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                        <button
                          onClick={() => setSellerForm({ ...sellerForm, qrCode: null })}
                          style={{ padding: "8px", borderRadius: "8px", background: "rgba(255, 68, 68, 0.1)", color: "#ff4444", border: "none", cursor: "pointer", fontSize: "12px" }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "24px" }}>
                <button onClick={() => setShowSellerModal(false)} style={{ padding: "14px", borderRadius: "12px", background: "none", border: `1px solid ${T.divider}`, color: T.textSub }}>Cancel</button>
                <button onClick={() => { setSeller(sellerForm); setShowSellerModal(false); showToast("Profile updated"); }} style={{ padding: "14px", borderRadius: "12px", background: "#f5c842", color: "#000", border: "none", fontWeight: "bold" }}>Save</button>
              </div>
            </div>
          </div>
        )
      }

      {
        showCurrencyPicker && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={(e) => e.target === e.currentTarget && setShowCurrencyPicker(false)}>
            <div style={{ background: T.modalBg, borderRadius: "24px", width: "100%", maxWidth: "400px", padding: "24px", border: `1px solid ${T.cardBorder}`, maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
              <h3 style={{ marginTop: 0 }}>Currency</h3>
              <input style={{ width: "100%", background: T.inputBg, border: `1px solid ${T.divider}`, borderRadius: "12px", padding: "12px", color: T.text, marginBottom: "12px", outline: "none" }} placeholder="Search..." value={currencySearch} onChange={(e) => setCurrencySearch(e.target.value)} />
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                {CURRENCIES.filter(c => c.name.toLowerCase().includes(currencySearch.toLowerCase()) || c.code.toLowerCase().includes(currencySearch.toLowerCase())).map(c => (
                  <button key={c.code} onClick={() => { setCurrency(c); setShowCurrencyPicker(false); }} style={{ display: "flex", justifyContent: "space-between", padding: "12px", borderRadius: "10px", background: currency.code === c.code ? "rgba(245,200,66,0.1)" : T.inputBg, border: `1px solid ${currency.code === c.code ? "#f5c842" : T.divider}`, color: T.text, cursor: "pointer" }}>
                    <span>{c.name} ({c.code})</span>
                    <span style={{ fontWeight: "bold", color: "#f5c842" }}>{c.symbol}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      }

      {
        openItemPicker !== null && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={(e) => e.target === e.currentTarget && setOpenItemPicker(null)}>
            <div style={{ background: T.modalBg, borderRadius: "24px", width: "100%", maxWidth: "400px", padding: "24px", border: `1px solid ${T.cardBorder}`, maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
              <h3 style={{ marginTop: 0 }}>Inventory</h3>
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                {products.length === 0 ? <div style={{ color: T.textSub, textAlign: "center", padding: "20px" }}>No items in inventory</div> : products.map(p => (
                  <button key={p.id} onClick={() => { updateItem(openItemPicker, { desc: p.name, price: p.price }); setOpenItemPicker(null); }} style={{ display: "flex", justifyContent: "space-between", padding: "12px", borderRadius: "10px", background: T.inputBg, border: `1px solid ${T.divider}`, color: T.text, cursor: "pointer" }}>
                    <span style={{ fontWeight: "600" }}>{p.name}</span>
                    <span style={{ fontWeight: "bold", color: "#f5c842" }}>{fmt(p.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      }

      <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
          body { margin: 0; background: ${T.bg}; overscroll-behavior: none; }
          * { box-sizing: border-box; }
          ::-webkit-scrollbar { width: 0; background: transparent; }
        `}</style>

      {
        deleteConfirm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ background: T.modalBg, borderRadius: "24px", width: "100%", maxWidth: "340px", padding: "24px", border: `1px solid ${T.cardBorder}`, textAlign: "center" }}>
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚠️</div>
              <h3 style={{ margin: "0 0 8px" }}>Confirm Delete</h3>
              <p style={{ fontSize: "14px", color: T.textSub, margin: "0 0 24px" }}>
                {deleteConfirm.type === "bulk" ? `Are you sure you want to delete ${selectedInvoices.length} invoices?` : `Are you sure you want to delete invoice ${deleteConfirm.id}?`} This action cannot be undone.
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: `1px solid ${T.divider}`, background: "none", color: T.text, fontWeight: "bold", cursor: "pointer" }}>Cancel</button>
                <button onClick={confirmDelete} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "none", background: "#ef4444", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>Delete</button>
              </div>
            </div>
          </div>
        )
      }

      {
        toast && (
          <div style={{ position: "fixed", bottom: "110px", left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? "#ef4444" : "#4ade80", color: "#000", padding: "10px 20px", borderRadius: "10px", fontWeight: "bold", zIndex: 1000 }}>
            {toast.msg}
          </div>
        )
      }
    </div >
  );
}
