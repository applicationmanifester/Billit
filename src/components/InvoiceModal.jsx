import React, { memo, useCallback } from "react";

const QuickAddItem = memo(({ product, onAdd, fmt }) => (
    <button onClick={() => onAdd(product)} style={{
        flexShrink: 0, padding: "8px 16px", borderRadius: "12px", background: "var(--bg-input)", border: "1px solid var(--border-primary)",
        whiteSpace: "nowrap", display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-start", cursor: "pointer", maxWidth: "150px"
    }}>
        <div style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{product.name}</div>
        <div style={{ fontSize: "10px", color: "var(--accent-primary)" }}>{fmt(product.price)}</div>
    </button>
));

const LineItem = memo(({ item, idx, updateItem, removeItem, taxRates, itemTaxTotal, calculateBaseFromTotal, saveInvoice, isLast, products }) => {
    const preventScrollValueChange = (e) => e.currentTarget.blur();
    const taxArr = Array.isArray(item.tax) ? item.tax : (item.tax ? [item.tax] : []);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [localTotal, setLocalTotal] = React.useState(null);

    const filteredProducts = (products || []).filter(p => 
        (p.name || "").toLowerCase().includes((item.desc || "").toLowerCase()) && 
        (p.name || "").toLowerCase() !== (item.desc || "").toLowerCase()
    );

    return (
        <div style={{ background: "var(--bg-card)", borderRadius: "16px", padding: "16px", marginBottom: "12px", border: `1px solid var(--border-primary)` }}>
            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                <div style={{ flex: 1, position: "relative" }}>
                    <input
                        className="input-field"
                        style={{ width: "100%", background: "none", borderBottom: `1px solid var(--border-primary)`, borderRadius: 0, padding: "4px 0" }}
                        placeholder="Item description"
                        value={item.desc}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        onKeyDown={(e) => e.key === "Enter" && saveInvoice()}
                        onChange={(e) => updateItem(idx, "desc", e.target.value)}
                    />
                    {showSuggestions && filteredProducts.length > 0 && (
                        <div style={{
                            position: "absolute", top: "100%", left: 0, right: 0, 
                            background: "var(--bg-card)", border: "1px solid var(--border-primary)",
                            borderRadius: "12px", marginTop: "4px", zIndex: 10,
                            maxHeight: "200px", overflowY: "auto", boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                            backdropFilter: "blur(10px)"
                        }}>
                            {filteredProducts.map(p => (
                                <div 
                                    key={p.id}
                                    onClick={() => {
                                        updateItem(idx, "desc", p.name);
                                        updateItem(idx, "price", p.price);
                                        updateItem(idx, "isInclusive", p.isInclusive || false);
                                        if (p.tax && p.tax.length > 0) {
                                            updateItem(idx, "tax", p.tax);
                                        }
                                        setShowSuggestions(false);
                                    }}
                                    style={{
                                        padding: "12px 14px", borderBottom: "1px solid var(--border-primary)",
                                        cursor: "pointer", fontSize: "13px", display: "flex", justifyContent: "space-between",
                                        background: "rgba(255,255,255,0.02)"
                                    }}
                                >
                                    <span style={{ fontWeight: "bold", color: "var(--text-primary)" }}>{p.name}</span>
                                    <span style={{ color: "var(--accent-primary)", fontWeight: "bold" }}>{p.price}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <button onClick={() => removeItem(idx)} style={{ color: "#ef4444", background: "none", border: "none", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div>
                    <label style={{ display: "block", fontSize: "10px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: "bold" }}>Qty</label>
                    <input type="number" min="1" className="input-field" style={{ width: "100%", padding: "10px" }} value={item.qty} onWheel={preventScrollValueChange} onChange={(e) => updateItem(idx, "qty", e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveInvoice()} />
                </div>
                <div>
                    <label style={{ display: "block", fontSize: "10px", color: "var(--accent-primary)", marginBottom: "4px", fontWeight: "bold" }}>Base Price(Excl tax)</label>
                    <input
                        className="input-field"
                        type="number"
                        step="any"
                        placeholder="Base"
                        value={item.price}
                        onWheel={preventScrollValueChange}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                            let val = e.target.value;
                            if (val.length > 20) val = val.slice(0, 20);
                            updateItem(idx, "price", val);
                            updateItem(idx, "isInclusive", false);
                        }}
                    />
                </div>
                <div>
                    <label style={{ display: "block", fontSize: "10px", color: "var(--accent-secondary)", marginBottom: "4px", fontWeight: "bold" }}>Total Price (incl Tax)</label>
                    <input
                        className="input-field"
                        style={{ border: "1px solid var(--border-accent)" }}
                        type="text"
                        inputMode="decimal"
                        placeholder="Total"
                        value={localTotal !== null ? localTotal : Math.round((Number(item.price || 0) + itemTaxTotal({ ...item, qty: 1 }, taxRates)) * 100) / 100}
                        onWheel={preventScrollValueChange}
                        onFocus={(e) => {
                            setLocalTotal(e.target.value);
                            e.target.select();
                        }}
                        onBlur={() => setLocalTotal(null)}
                        onChange={(e) => {
                            let raw = e.target.value;
                            if (raw.length > 20) return;
                            // Allow only numbers and a single decimal point
                            raw = raw.replace(/[^0-9.]/g, '');
                            const parts = raw.split('.');
                            if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
                            setLocalTotal(raw);

                            if (raw === "" || raw === ".") {
                                updateItem(idx, "price", 0);
                                updateItem(idx, "isInclusive", true);
                                return;
                            }
                            const newVal = parseFloat(raw) || 0;
                            const base = calculateBaseFromTotal(newVal, taxRates, item.tax);
                            updateItem(idx, "price", base);
                            updateItem(idx, "isInclusive", true);
                        }}
                    />
                </div>
            </div>

            <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {taxRates.map(tr => {
                    const isActive = taxArr.includes(tr.id);
                    return (
                        <button key={tr.id} onClick={() => {
                            updateItem(idx, "tax", isActive ? taxArr.filter(id => id !== tr.id) : [...taxArr, tr.id]);
                        }} style={{
                            padding: "8px 14px", borderRadius: "10px", fontSize: "11px", fontWeight: "bold",
                            minHeight: "36px",
                            border: `1px solid ${isActive ? "var(--accent-primary)" : "var(--border-primary)"}`,
                            background: isActive ? "var(--accent-primary)" : "rgba(255,255,255,0.03)",
                            color: isActive ? "#000" : "var(--text-secondary)",
                            cursor: "pointer"
                        }}>{tr.label} {tr.rate}%</button>
                    );
                })}
            </div>
            {!isLast && (
                <div style={{ height: "1px", background: "var(--border-primary)", margin: "20px -16px 0", opacity: 0.5 }} />
            )}
        </div>
    );
});

export const InvoiceModal = ({
    showModal, setShowModal, form, setForm, clients, products, taxRates, saveInvoice, addItem, removeItem, updateItem, fmt, totalWithTax, itemTaxTotal, calculateBaseFromTotal, playFeedback, showToast, selectedInvoice, isSaving
}) => {
    const [modalTab, setModalTab] = React.useState("items");

    const handleQuickAdd = useCallback((p) => {
        const taxIds = (p.tax && p.tax.length > 0) ? p.tax : taxRates.map(t => t.id);
        const newItem = { id: crypto.randomUUID(), desc: p.name, qty: 1, price: p.price, hsn: p.hsn || "", tax: taxIds, isInclusive: p.isInclusive || false };
        
        setForm(prev => {
            if (prev.items.length === 1 && !prev.items[0].desc) {
                return { ...prev, items: [newItem] };
            } else {
                return { ...prev, items: [...prev.items, newItem] };
            }
        });
        showToast(`Added ${p.name}`);
        playFeedback();
    }, [taxRates, showToast, playFeedback, setForm]);

    if (showModal !== "invoice") return null;

    const isEdit = !!selectedInvoice;
    const toNumber = (value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    return (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "calc(20px + var(--safe-area-top)) 20px 40px", overflowY: "auto" }} onClick={(e) => e.target === e.currentTarget && setShowModal(null)}>
            <div className="premium-card animate-slide-up modal-card modal-content-wrapper" style={{ borderRadius: "20px", width: "100%", maxWidth: "480px", padding: "24px 20px 40px", position: "relative" }}>
                <div style={{ width: "40px", height: "4px", background: "var(--border-primary)", borderRadius: "2px", margin: "0 auto 24px" }} />

                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                    <button onClick={() => setShowModal(null)} style={{ background: "rgba(0,0,0,0.05)", border: "none", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-primary)" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    </button>
                    <h2 style={{ margin: 0, fontSize: "20px" }}>{isEdit ? "Edit Invoice" : "New Invoice"}</h2>
                </div>

                <div style={{ display: "flex", gap: "8px", marginBottom: "24px", background: "var(--bg-input)", padding: "4px", borderRadius: "14px" }}>
                    {["items", "info", "advanced"].map(t => (
                        <button key={t} onClick={() => setModalTab(t)} style={{
                            flex: 1, padding: "10px", borderRadius: "10px", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase",
                            border: "none", cursor: "pointer", transition: "all 0.2s",
                            background: modalTab === t ? "var(--accent-primary)" : "transparent",
                            color: modalTab === t ? "#000" : "var(--text-secondary)"
                        }}>{t}</button>
                    ))}
                </div>

                {modalTab === "info" && (
                    <div className="animate-fade-in">
                        <div style={{ marginBottom: "20px" }}>
                            <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", fontWeight: "bold", textTransform: "uppercase", marginBottom: "8px" }}>Select Client <span style={{color: '#ef4444'}}>*</span></label>
                            <select className="input-field" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: String(e.target.value) })} onKeyDown={(e) => e.key === "Enter" && saveInvoice()} style={{ width: "100%", height: "50px", appearance: "none" }}>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", fontWeight: "bold", textTransform: "uppercase", marginBottom: "8px" }}>Date <span style={{color: '#ef4444'}}>*</span></label>
                                <input type="date" className="input-field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} onKeyDown={(e) => e.key === "Enter" && saveInvoice()} style={{ width: "100%" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", fontWeight: "bold", textTransform: "uppercase", marginBottom: "8px" }}>Due Date</label>
                                <input type="date" className="input-field" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} onKeyDown={(e) => e.key === "Enter" && saveInvoice()} style={{ width: "100%" }} />
                            </div>
                        </div>

                        <div style={{ marginBottom: "24px" }}>
                            <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", fontWeight: "bold", textTransform: "uppercase", marginBottom: "8px" }}>Notes</label>
                            <textarea
                                className="input-field"
                                style={{ height: "100px", resize: "none" }}
                                placeholder="Add some notes for the seller..."
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {modalTab === "items" && (
                    <div className="animate-fade-in">
                        <div style={{ marginBottom: "24px" }}>
                            <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", fontWeight: "bold", textTransform: "uppercase", marginBottom: "8px" }}>Quick Add from Inventory</label>
                            <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "10px", scrollbarWidth: "none" }}>
                                {(products || []).map(p => (
                                    <QuickAddItem key={p.id} product={p} onAdd={handleQuickAdd} fmt={fmt} />
                                ))}
                                {(!products || products.length === 0) && (
                                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", opacity: 0.6 }}>No inventory items yet.</div>
                                )}
                            </div>
                        </div>

                        <div style={{ marginBottom: "24px", borderTop: "1px solid var(--border-primary)", paddingTop: "24px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                <label style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "bold", textTransform: "uppercase" }}>Line Items <span style={{color: '#ef4444'}}>*</span></label>
                                <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{form.items.length} items</span>
                            </div>

                            {form.items.map((item, idx) => (
                                <LineItem 
                                    key={item.id} 
                                    item={item} 
                                    idx={idx} 
                                    updateItem={updateItem} 
                                    removeItem={removeItem} 
                                    taxRates={taxRates} 
                                    itemTaxTotal={itemTaxTotal} 
                                    calculateBaseFromTotal={calculateBaseFromTotal} 
                                    saveInvoice={saveInvoice} 
                                    isLast={idx === form.items.length - 1}
                                    products={products}
                                />
                            ))}
                            <button onClick={addItem} style={{ width: "100%", padding: "12px", marginTop: "8px", fontSize: "12px", color: "var(--accent-primary)", background: "rgba(255,193,7,0.05)", border: `1px dashed var(--accent-primary)`, borderRadius: "12px", fontWeight: "bold", cursor: "pointer" }}>+ Add Line Item</button>
                        </div>
                    </div>
                )}

                {modalTab === "advanced" && (
                    <div className="animate-fade-in">
                        <div style={{ marginBottom: "24px" }}>
                            <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", fontWeight: "bold", textTransform: "uppercase", marginBottom: "8px" }}>P.O. Number</label>
                            <input className="input-field" placeholder="P.O. #" value={form.poNumber || ""} onChange={(e) => setForm({ ...form, poNumber: e.target.value })} onKeyDown={(e) => e.key === "Enter" && saveInvoice()} style={{ width: "100%" }} />
                        </div>

                        <div style={{ marginBottom: "24px" }}>
                            <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", fontWeight: "bold", textTransform: "uppercase", marginBottom: "12px" }}>HSN/SAC Management</label>
                            <div style={{ background: "var(--bg-input)", borderRadius: "16px", padding: "12px", border: "1px solid var(--border-primary)" }}>
                                {form.items.map((item, idx) => (
                                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: idx === form.items.length - 1 ? 0 : "12px", paddingBottom: idx === form.items.length - 1 ? 0 : "12px", borderBottom: idx === form.items.length - 1 ? "none" : "1px solid var(--border-primary)" }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-primary)", marginBottom: "2px" }}>{item.desc || "Untitled Item"}</div>
                                            <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Item {idx + 1}</div>
                                        </div>
                                        <input
                                            className="input-field"
                                            style={{ width: "120px", height: "40px", fontSize: "12px" }}
                                            placeholder="HSN/SAC"
                                            value={item.hsn || ""}
                                            onChange={(e) => updateItem(idx, "hsn", e.target.value.toUpperCase())}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ background: "var(--bg-input)", borderRadius: "20px", padding: "20px", marginBottom: "32px", border: `1px solid var(--border-primary)` }}>
                    {form.items.filter(i => i.desc || toNumber(i.price) > 0).map((item, idx) => (
                        <div key={item.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "14px" }}>
                            <span style={{ color: "var(--text-secondary)", flex: 1, marginRight: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.desc || "Untitled Item"} <span style={{ opacity: 0.6, fontSize: "11px", marginLeft: "4px" }}>x{item.qty}</span>
                            </span>
                            <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>{fmt(Math.round(toNumber(item.qty) * toNumber(item.price) * 100) / 100)}</span>
                        </div>
                    ))}
                    {form.items.filter(i => i.desc || toNumber(i.price) > 0).length > 0 && (
                         <div style={{ height: "1px", background: "var(--border-primary)", margin: "14px 0", opacity: 0.4 }} />
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Subtotal</span>
                        <span style={{ fontWeight: "bold" }}>{fmt(form.items.reduce((s, i) => s + Math.round(toNumber(i.qty) * toNumber(i.price) * 100) / 100, 0))}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", paddingBottom: "12px", borderBottom: `1px solid var(--border-primary)` }}>
                        <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Taxes</span>
                        <span style={{ fontWeight: "bold" }}>{fmt(form.items.reduce((s, i) => s + itemTaxTotal(i, taxRates), 0))}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: "bold", fontSize: "18px" }}>Total Amount</span>
                        <span style={{ fontWeight: "900", fontSize: "20px", color: "var(--accent-primary)" }}>{fmt(Math.round(totalWithTax(form.items, taxRates) * 100) / 100)}</span>
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.2fr", gap: "10px" }}>
                        <button disabled={!!isSaving} onClick={() => saveInvoice("download")} className="secondary-btn" style={{ padding: "14px 4px", fontSize: "10px", whiteSpace: "nowrap", opacity: isSaving ? 0.7 : 1 }}>
                            {isSaving === "download" ? "Wait..." : "⬇ Download"}
                        </button>
                        <button disabled={!!isSaving} onClick={() => saveInvoice("share")} className="secondary-btn" style={{ padding: "14px 4px", fontSize: "10px", whiteSpace: "nowrap", opacity: isSaving ? 0.7 : 1 }}>
                            {isSaving === "share" ? "Wait..." : "📨 Share"}
                        </button>
                        <button disabled={!!isSaving} onClick={() => saveInvoice("print")} className="secondary-btn" style={{ padding: "14px 4px", fontSize: "10px", whiteSpace: "nowrap", opacity: isSaving ? 0.7 : 1 }}>
                            {isSaving === "print" ? "Wait..." : "🖨️ Print"}
                        </button>
                        <button disabled={!!isSaving} onClick={() => saveInvoice("thermal")} className="secondary-btn" style={{ padding: "14px 4px", fontSize: "10px", whiteSpace: "nowrap", opacity: isSaving ? 0.7 : 1 }}>
                            {isSaving === "thermal" ? "Wait..." : "🧾 Thermal"}
                        </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <button disabled={!!isSaving} onClick={() => setShowModal(null)} className="secondary-btn" style={{ padding: "14px", border: "1px solid #ef4444", color: "#ef4444", background: "none", fontSize: "13px", opacity: isSaving ? 0.7 : 1 }}>Cancel</button>
                        <button disabled={!!isSaving} onClick={() => saveInvoice()} className="primary-btn" style={{ padding: "14px", fontSize: "13px", opacity: isSaving ? 0.7 : 1 }}>
                            {isSaving === "save" ? "Saving..." : (isEdit ? "Update Invoice" : "Create Invoice")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
