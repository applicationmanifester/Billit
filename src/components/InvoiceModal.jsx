export const InvoiceModal = ({
    showModal, setShowModal, form, setForm, clients, products, taxRates, saveInvoice, addItem, removeItem, updateItem, fmt, totalWithTax, itemTaxTotal, playFeedback, showToast, selectedInvoice, isSaving
}) => {
    if (showModal !== "invoice") return null;

    const isEdit = !!selectedInvoice;

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={(e) => e.target === e.currentTarget && setShowModal(null)}>
            <div className="premium-card animate-slide-up" style={{ borderRadius: "20px 20px 0 0", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto", padding: "24px 20px 40px" }}>
                <div style={{ width: "40px", height: "4px", background: "var(--border-primary)", borderRadius: "2px", margin: "0 auto 24px" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h2 style={{ margin: 0, fontSize: "20px" }}>{isEdit ? "Edit Invoice" : "New Invoice"}</h2>
                    <button onClick={() => setShowModal(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>✕</button>
                </div>

                <datalist id="product-suggestions">
                    {products.map(p => <option key={p.id} value={p.name} />)}
                </datalist>

                <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", fontWeight: "bold", textTransform: "uppercase", marginBottom: "8px" }}>Select Client</label>
                    <select className="input-field" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} style={{ width: "100%", height: "50px", appearance: "none" }}>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                    <div>
                        <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", fontWeight: "bold", textTransform: "uppercase", marginBottom: "8px" }}>Date</label>
                        <input type="date" className="input-field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ width: "100%" }} />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", fontWeight: "bold", textTransform: "uppercase", marginBottom: "8px" }}>Due Date</label>
                        <input type="date" className="input-field" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} style={{ width: "100%" }} />
                    </div>
                </div>

                {/* Inventory Selection Shelf */}
                {products.length > 0 && (
                    <div style={{ margin: "0 -20px 24px", padding: "0 20px" }}>
                        <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", fontWeight: "bold", textTransform: "uppercase", marginBottom: "8px" }}>Quick Add from Inventory</label>
                        <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "10px" }}>
                            {products.map(p => (
                                <button key={p.id} onClick={() => {
                                    const taxIds = taxRates.map(t => t.id);
                                    const newItem = { desc: p.name, qty: 1, price: p.price, tax: taxIds };
                                    if (form.items.length === 1 && !form.items[0].desc) {
                                        setForm({ ...form, items: [newItem] });
                                    } else {
                                        setForm({ ...form, items: [...form.items, newItem] });
                                    }
                                    playFeedback();
                                }} style={{
                                    flexShrink: 0, padding: "10px 14px", borderRadius: "12px", background: "var(--bg-input)",
                                    border: `1px solid var(--border-primary)`, textAlign: "left", cursor: "pointer", maxWidth: "140px"
                                }}>
                                    <div style={{ fontSize: "13px", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                                    <div style={{ fontSize: "11px", color: "var(--accent-primary)" }}>{fmt(p.price)}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ marginBottom: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <label style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "bold", textTransform: "uppercase" }}>Line Items</label>
                    </div>

                    {form.items.map((item, idx) => (
                        <div key={idx} style={{ background: "var(--bg-input)", borderRadius: "16px", padding: "16px", marginBottom: "12px", border: `1px solid var(--border-primary)` }}>
                            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                                <input
                                    list="product-suggestions"
                                    className="input-field"
                                    style={{ flex: 1, background: "none", borderBottom: `1px solid var(--border-primary)`, borderRadius: 0, padding: "4px 0" }}
                                    placeholder="Item description"
                                    value={item.desc}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const found = products.find(p => p.name === val);
                                        if (found) {
                                            updateItem(idx, { desc: found.name, price: found.price });
                                        } else {
                                            updateItem(idx, "desc", val);
                                        }
                                    }}
                                />
                                <button onClick={() => removeItem(idx)} style={{ color: "#ef4444", background: "none", border: "none", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>Remove</button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "10px", color: "var(--text-secondary)", marginBottom: "4px" }}>Qty</label>
                                    <input type="number" min="0" className="input-field" style={{ width: "100%", padding: "8px" }} value={item.qty} onChange={(e) => updateItem(idx, "qty", e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "10px", color: "var(--text-secondary)", marginBottom: "4px" }}>Price</label>
                                    <input type="number" min="0" className="input-field" style={{ width: "100%", padding: "8px" }} value={item.price} onChange={(e) => updateItem(idx, "price", e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "10px", color: "var(--text-secondary)", marginBottom: "4px" }}>Total</label>
                                    <div style={{ padding: "8px 0", fontSize: "14px", fontWeight: "bold" }}>{fmt(item.qty * item.price)}</div>
                                </div>
                            </div>

                            <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                {taxRates.map(tr => (
                                    <button key={tr.id} onClick={() => {
                                        const has = item.tax.includes(tr.id);
                                        updateItem(idx, "tax", has ? item.tax.filter(id => id !== tr.id) : [...item.tax, tr.id]);
                                    }} style={{
                                        padding: "4px 10px", borderRadius: "8px", fontSize: "10px", fontWeight: "bold",
                                        border: `1px solid ${item.tax.includes(tr.id) ? "var(--accent-primary)" : "var(--border-primary)"}`,
                                        background: item.tax.includes(tr.id) ? "var(--accent-primary)" : "none",
                                        color: item.tax.includes(tr.id) ? "#000" : "var(--text-secondary)"
                                    }}>{tr.label} ({tr.rate}%)</button>
                                ))}
                            </div>
                        </div>
                    ))}
                    <button onClick={addItem} style={{ width: "100%", padding: "12px", marginTop: "8px", fontSize: "12px", color: "var(--accent-primary)", background: "rgba(255,193,7,0.05)", border: `1px dashed var(--accent-primary)`, borderRadius: "12px", fontWeight: "bold", cursor: "pointer" }}>+ Add Line Item</button>
                </div>

                <div style={{ marginBottom: "24px" }}>
                    <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", fontWeight: "bold", textTransform: "uppercase", marginBottom: "8px" }}>Notes</label>
                    <textarea
                        className="input-field"
                        style={{ height: "60px", resize: "none" }}
                        placeholder="Add some notes for the seller..."
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                </div>

                <div style={{ background: "var(--bg-input)", borderRadius: "20px", padding: "20px", marginBottom: "32px", border: `1px solid var(--border-primary)` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Subtotal</span>
                        <span style={{ fontWeight: "bold" }}>{fmt(form.items.reduce((s, i) => s + (i.qty * i.price), 0))}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", paddingBottom: "12px", borderBottom: `1px solid var(--border-primary)` }}>
                        <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Taxes</span>
                        <span style={{ fontWeight: "bold" }}>{fmt(form.items.reduce((s, i) => s + itemTaxTotal(i, taxRates), 0))}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: "bold", fontSize: "18px" }}>Total Amount</span>
                        <span style={{ fontWeight: "900", fontSize: "20px", color: "var(--accent-primary)" }}>{fmt(totalWithTax(form.items, taxRates))}</span>
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                        <button disabled={!!isSaving} onClick={() => saveInvoice("download")} className="secondary-btn" style={{ padding: "14px", fontSize: "12px", whiteSpace: "nowrap", opacity: isSaving ? 0.7 : 1 }}>
                            {isSaving === "download" ? "..." : "⬇ Download"}
                        </button>
                        <button disabled={!!isSaving} onClick={() => saveInvoice("print")} className="secondary-btn" style={{ padding: "14px", fontSize: "12px", whiteSpace: "nowrap", opacity: isSaving ? 0.7 : 1 }}>
                            {isSaving === "print" ? "..." : "🖨️ Print"}
                        </button>
                        <button disabled={!!isSaving} onClick={() => saveInvoice("share")} className="secondary-btn" style={{ padding: "14px", fontSize: "12px", whiteSpace: "nowrap", opacity: isSaving ? 0.7 : 1 }}>
                            {isSaving === "share" ? "..." : "📨 Share"}
                        </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <button disabled={!!isSaving} onClick={() => setShowModal(null)} className="secondary-btn" style={{ padding: "14px", border: "1px solid #ef4444", color: "#ef4444", background: "none", fontSize: "13px", opacity: isSaving ? 0.7 : 1 }}>Cancel</button>
                        <button disabled={!!isSaving} onClick={() => saveInvoice()} className="primary-btn" style={{ padding: "14px", fontSize: "13px", opacity: isSaving ? 0.7 : 1 }}>
                            {isSaving === "save" ? "Saving..." : (isEdit ? "Update" : "Save")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
