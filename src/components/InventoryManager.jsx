import React from "react";
import { ProductImage } from "./ProductImage";
import { getProductImage } from "../lib/db";

export const InventoryManager = ({
    inventoryTitle,
    editingInventoryTitle,
    setEditingInventoryTitle,
    setInventoryTitle,
    downloadInventoryPDF,
    printInventoryPDF,
    shareInventoryPDF,
    printInventoryThermal,
    setProductForm,
    setEditingProductId,
    setShowModal,
    products,
    setProducts,
    inventorySort,
    setInventorySort,
    setDeleteConfirm,
    fmt,
    taxRates,
    itemTaxTotal,
    invoices,
    search
}) => {
    const filteredProducts = (products || []).filter(p => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (p.name || "").toLowerCase().includes(s) || (p.desc || "").toLowerCase().includes(s);
    });
    return (
        <div style={{ padding: "16px" }} className="animate-slide-up">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                <div style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    padding: "0 16px",
                    minHeight: "60px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    display: "flex",
                    alignItems: "center",
                    boxSizing: "border-box"
                }}>
                    {editingInventoryTitle ? (
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", width: "100%", padding: "10px 0" }}>
                            <input
                                autoFocus
                                className="input-field"
                                style={{ background: "none", border: "none", color: "var(--accent-primary)", fontSize: "18px", fontWeight: "bold", flex: 1, padding: 0 }}
                                value={inventoryTitle}
                                onChange={(e) => setInventoryTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                                onBlur={() => {
                                    setEditingInventoryTitle(false);
                                    if (!inventoryTitle.trim()) setInventoryTitle("Inventory List");
                                    localStorage.setItem("billit_inventoryTitle", JSON.stringify(inventoryTitle.trim() || "Inventory List"));
                                }}
                            />
                            <button
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setEditingInventoryTitle(false)}
                                style={{
                                    padding: "8px 16px", borderRadius: "8px",
                                    background: "var(--accent-primary)", color: "#000",
                                    border: "none", fontWeight: "bold", fontSize: "12px"
                                }}
                            >
                                Save
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", justifyContent: "space-between", padding: "10px 0" }}>
                            <h2 style={{ margin: 0, fontSize: "18px", color: "var(--accent-primary)", fontWeight: "bold", flex: 1 }}>
                                {inventoryTitle}
                            </h2>
                            <button
                                onClick={() => setEditingInventoryTitle(true)}
                                style={{
                                    padding: "8px 16px", borderRadius: "8px",
                                    background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)",
                                    border: "none", fontWeight: "bold", fontSize: "12px"
                                }}
                            >
                                Edit
                            </button>
                        </div>
                    )}
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button onClick={printInventoryPDF} className="secondary-btn" style={{ flex: "1 1 auto", minWidth: "80px", padding: "10px", border: "1px solid var(--accent-primary)", color: "var(--accent-primary)", background: "none", fontSize: "11px", borderRadius: "8px" }}>Print</button>
                    <button onClick={downloadInventoryPDF} className="secondary-btn" style={{ flex: "1 1 auto", minWidth: "80px", padding: "10px", border: "1px solid var(--accent-primary)", color: "var(--accent-primary)", background: "none", fontSize: "11px", borderRadius: "8px" }}>Download</button>
                    <button onClick={printInventoryThermal} className="secondary-btn" style={{ flex: "1 1 auto", minWidth: "80px", padding: "10px", border: "1px solid var(--accent-primary)", color: "var(--accent-primary)", background: "none", fontSize: "11px", borderRadius: "8px" }}>Thermal</button>
                    <button onClick={shareInventoryPDF} className="secondary-btn" style={{ flex: "1 1 auto", minWidth: "80px", padding: "10px", border: "1px solid var(--accent-primary)", color: "var(--accent-primary)", background: "none", fontSize: "11px", borderRadius: "8px" }}>Share</button>
                </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", alignItems: "center" }}>
                <button onClick={() => { setProductForm({ name: "", desc: "", price: "", isDefault: false, tax: (taxRates || []).map(t => t.id) }); setEditingProductId(null); setShowModal("product"); }} style={{ flex: 1, padding: "14px", borderRadius: "12px", background: "none", border: `2px dashed var(--border-primary)`, color: "var(--accent-primary)", fontWeight: "bold" }}>+ Add to Inventory</button>
                <select
                  value={inventorySort}
                  onChange={(e) => setInventorySort(e.target.value)}
                  style={{
                    height: "46px", padding: "0 12px", borderRadius: "12px",
                    background: "var(--bg-card)", color: "var(--text-primary)",
                    border: "1px solid var(--border-primary)", fontSize: "12px", fontWeight: "bold",
                    outline: "none", cursor: "pointer"
                  }}
                >
                  <option value="nameAsc">Name (A-Z)</option>
                  <option value="nameDesc">Name (Z-A)</option>
                  <option value="priceAsc">Price (Low)</option>
                  <option value="priceDesc">Price (High)</option>
                  <option value="default">Default First</option>
                </select>
            </div>
            {filteredProducts.slice().sort((a, b) => {
                if (inventorySort === "nameAsc") return a.name.localeCompare(b.name);
                if (inventorySort === "nameDesc") return b.name.localeCompare(a.name);
                if (inventorySort === "priceAsc") return (a.price || 0) - (b.price || 0);
                if (inventorySort === "priceDesc") return (b.price || 0) - (a.price || 0);
                if (inventorySort === "default") return (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0);
                return 0;
            }).map(p => (
                <div key={p.id} className="premium-card" style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                        {p.image && (
                            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--bg-input)", overflow: "hidden", marginRight: "10px" }}>
                                <ProductImage productId={p.id} fallbackImage={p.image !== true ? p.image : null} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                        )}
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div style={{ fontSize: "15px", fontWeight: "bold" }}>{p.name}</div>
                                {p.isDefault && <span style={{ fontSize: "10px", background: "var(--border-accent)", color: "var(--accent-primary)", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>⚡ AUTO</span>}
                            </div>
                            {p.desc && <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>{p.desc}</div>}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "4px" }}>
                                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                    Price: <span style={{ color: "var(--text-primary)", fontWeight: "bold" }}>{fmt(p.price)}</span>
                                </div>
                                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                    Tax: <span style={{ color: "var(--accent-secondary)", fontWeight: "bold" }}>{fmt(itemTaxTotal({ ...p, qty: 1, tax: p.tax || (taxRates || []).map(t => t.id) }, taxRates))}</span>
                                </div>
                                <div style={{ fontSize: "13px", color: "var(--accent-primary)", fontWeight: "bold" }}>
                                    Total: {fmt(Number(p.price || 0) + itemTaxTotal({ ...p, qty: 1, tax: p.tax || (taxRates || []).map(t => t.id) }, taxRates))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={async () => {
                            let pWithImage = { ...p };
                            if (p.image === true) {
                                const stored = await getProductImage(p.id);
                                if (stored) pWithImage.image = stored;
                            }
                            const pWithTaxes = { ...pWithImage, tax: (p.tax && p.tax.length > 0) ? p.tax : (taxRates || []).map(t => t.id) };
                            setProductForm(pWithTaxes);
                            setEditingProductId(p.id);
                            setShowModal("product");
                            }} style={{
                            padding: "10px 16px", borderRadius: "10px", background: "var(--accent-primary)", color: "#000", border: "none", fontWeight: "bold", fontSize: "12px", cursor: "pointer", transition: "all 0.2s", minHeight: "44px"
                        }}>Edit</button>
                        <button onClick={() => {
                            const usedInInvoices = (invoices || []).filter(inv => (inv.items || []).some(it => it.desc === p.name || it.desc === p.desc)).length;
                            setDeleteConfirm({ type: "product", id: p.id, name: p.name, usedInInvoices });
                        }} style={{
                            padding: "10px 16px", borderRadius: "10px", background: "#ef4444", color: "#fff", border: "none", fontWeight: "bold", fontSize: "12px", cursor: "pointer", transition: "all 0.2s", minHeight: "44px"
                        }}>Delete</button>
                    </div>
                </div>
            ))}
            {filteredProducts.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">{search ? "🔍" : "📦"}</div>
                    <div className="empty-state-title">{search ? "No matches found" : "Your inventory is empty"}</div>
                    <p className="empty-state-text">{search ? `We couldn't find any items matching "${search}"` : "Add your products or services to speed up invoice creation with pre-filled details."}</p>
                    {!search && <button onClick={() => { setProductForm({ name: "", price: "", isDefault: false, tax: (taxRates || []).map(t => t.id) }); setEditingProductId(null); setShowModal("product"); }} className="primary-btn">Add First Item</button>}
                </div>
            )}
        </div>
    );
};
