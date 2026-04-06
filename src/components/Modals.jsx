import React from "react";

export const ClientModal = ({ showModal, setShowModal, clientForm, setClientForm, selectedClient, saveClient, setDeleteConfirm }) => {
    if (showModal !== "client") return null;

    return (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "calc(20px + var(--safe-area-top)) 20px 40px", overflowY: "auto" }} onClick={(e) => e.target === e.currentTarget && setShowModal(null)}>
            <div className="premium-card animate-slide-up modal-card modal-content-wrapper" style={{ borderRadius: "20px", width: "100%", maxWidth: "480px", padding: "24px 20px 40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                    <button onClick={() => setShowModal(null)} style={{ background: "rgba(0,0,0,0.05)", border: "none", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-primary)" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    </button>
                    <h2 style={{ margin: 0, fontSize: "20px" }}>{selectedClient ? "Edit Client" : "New Client"}</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Client Name <span style={{color: '#ef4444'}}>*</span></div>
                        <input className="input-field" placeholder="Client Name" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && saveClient()} />
                    </div>
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Email Address</div>
                        <input className="input-field" placeholder="Email Address" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} onKeyDown={(e) => e.key === "Enter" && saveClient()} />
                    </div>
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Phone Number</div>
                        <input className="input-field" type="tel" placeholder="Phone Number" value={clientForm.phone}
                            onKeyDown={(e) => e.key === "Enter" && saveClient()}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9+]/g, '');
                                setClientForm({ ...clientForm, phone: val });
                            }}
                        />
                    </div>
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Address</div>
                        <textarea className="input-field" placeholder="Address" style={{ height: "80px", paddingTop: "12px" }} value={clientForm.address}
                            onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                            onKeyDown={(e) => e.key === "Enter" && saveClient()}
                        />
                    </div>
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>GSTIN</div>
                        <input className="input-field" placeholder="GSTIN (Optional)" value={clientForm.gstin || ""} onChange={(e) => setClientForm({ ...clientForm, gstin: e.target.value.toUpperCase() })} onKeyDown={(e) => e.key === "Enter" && saveClient()} />
                    </div>
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Location URL (Optional)</div>
                        <input className="input-field" placeholder="https://maps.google.com/..." value={clientForm.locationUrl || ""} onChange={(e) => setClientForm({ ...clientForm, locationUrl: e.target.value })} onKeyDown={(e) => e.key === "Enter" && saveClient()} />
                    </div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    {selectedClient && (
                        <button onClick={() => { setShowModal(null); setDeleteConfirm({ type: "client", id: selectedClient.id, name: selectedClient.name }); }} className="secondary-btn" style={{ flex: 1, padding: "16px", color: "#ef4444", border: "1px solid #ef4444" }}>Delete</button>
                    )}
                    <button onClick={saveClient} className="primary-btn" style={{ flex: 2, padding: "16px" }}>Save Client</button>
                </div>
            </div>
        </div>
    );
};

export const ProductModal = ({ showModal, setShowModal, productForm, setProductForm, editingProductId, saveProduct, compressImage, taxRates, itemTaxTotal, calculateBaseFromTotal, setDeleteConfirm }) => {
    const [modalTab, setModalTab] = React.useState("basic");
    const [localTotal, setLocalTotal] = React.useState(null);

    React.useEffect(() => {
        if (showModal === "product") {
            setLocalTotal(null);
            setModalTab("basic");
        }
    }, [showModal]);

    if (showModal !== "product") return null;

    return (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "calc(20px + var(--safe-area-top)) 20px 40px", overflowY: "auto" }} onClick={(e) => e.target === e.currentTarget && setShowModal(null)}>
            <div className="premium-card animate-slide-up modal-card modal-content-wrapper" style={{ borderRadius: "20px", width: "100%", maxWidth: "480px", padding: "24px 20px 40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                    <button onClick={() => setShowModal(null)} style={{ background: "rgba(0,0,0,0.05)", border: "none", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-primary)" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    </button>
                    <h2 style={{ margin: 0, fontSize: "20px" }}>{editingProductId ? "Edit Item" : "Add to Inventory"}</h2>
                </div>

                <div style={{ display: "flex", gap: "8px", marginBottom: "20px", background: "var(--bg-input)", padding: "4px", borderRadius: "14px" }}>
                    {["basic", "advanced"].map(t => (
                        <button key={t} onClick={() => setModalTab(t)} style={{
                            flex: 1, padding: "10px", borderRadius: "10px", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase",
                            border: "none", cursor: "pointer", transition: "all 0.2s",
                            background: modalTab === t ? "var(--accent-primary)" : "transparent",
                            color: modalTab === t ? "#000" : "var(--text-secondary)"
                        }}>{t}</button>
                    ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
                    {modalTab === "basic" && (
                        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Item Name <span style={{color: '#ef4444'}}>*</span></div>
                                <input className="input-field" placeholder="Item Name" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && saveProduct(false)} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div>
                                    <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Base Price <span style={{color: '#ef4444'}}>*</span></div>
                                    <input type="number" step="any" className="input-field" placeholder="0.00"
                                        value={productForm.price}
                                        onFocus={(e) => e.target.select()}
                                        onKeyDown={(e) => e.key === "Enter" && saveProduct(false)}
                                        onChange={(e) => {
                                            let raw = e.target.value;
                                            if (raw.length > 20) raw = raw.slice(0, 20);
                                            setProductForm({ ...productForm, price: raw });
                                        }}
                                    />
                                </div>
                                <div>
                                    <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Estimated Tax</div>
                                    <div style={{ padding: "8px 12px", fontSize: "14px", fontWeight: "bold", color: "var(--accent-secondary)", background: "var(--bg-input)", borderRadius: "12px", border: "1px solid var(--border-primary)", height: "42px", display: "flex", alignItems: "center" }}>
                                        {Math.round(itemTaxTotal({ ...productForm, qty: 1, tax: productForm.tax || [] }, taxRates) * 100) / 100}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Total Price (incl Tax)</div>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="input-field"
                                    style={{ background: "var(--bg-input)", padding: "14px", border: "1px solid var(--accent-primary)", fontSize: "16px", fontWeight: "bold" }}
                                    placeholder="0.00"
                                    value={localTotal !== null ? localTotal : (productForm.price === "" ? "" : Math.round((Number(productForm.price || 0) + itemTaxTotal({ ...productForm, qty: 1, tax: productForm.tax || [] }, taxRates)) * 100) / 100)}
                                    onFocus={(e) => {
                                        setLocalTotal(e.target.value);
                                        e.target.select();
                                    }}
                                    onBlur={() => setLocalTotal(null)}
                                    onKeyDown={(e) => e.key === "Enter" && saveProduct(false)}
                                    onChange={(e) => {
                                        let raw = e.target.value;
                                        if (raw.length > 20) return;
                                        // Allow only numbers and a single decimal point
                                        raw = raw.replace(/[^0-9.]/g, '');
                                        const parts = raw.split('.');
                                        if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
                                        setLocalTotal(raw);

                                        if (raw === "" || raw === ".") {
                                            setProductForm({ ...productForm, price: "" });
                                            return;
                                        }
                                        const newVal = parseFloat(raw) || 0;
                                        const base = calculateBaseFromTotal(newVal, taxRates, productForm.tax || []);
                                        setProductForm({ ...productForm, price: base });
                                    }}
                                />
                            </div>

                            <div>
                                <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "8px", marginLeft: "4px" }}>Tax Application</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                    {taxRates.map(tr => (
                                        <button
                                            key={tr.id}
                                            onKeyDown={(e) => e.key === "Enter" && saveProduct(false)}
                                            onClick={() => {
                                                const current = Array.isArray(productForm.tax) ? productForm.tax : (productForm.tax ? [productForm.tax] : []);
                                                if (current.includes(tr.id)) {
                                                    setProductForm({ ...productForm, tax: current.filter(id => id !== tr.id) });
                                                } else {
                                                    setProductForm({ ...productForm, tax: [...current, tr.id] });
                                                }
                                            }}
                                            style={{
                                                padding: "10px 16px",
                                                borderRadius: "12px",
                                                fontSize: "11px",
                                                fontWeight: "bold",
                                                cursor: "pointer",
                                                transition: "all 0.2s",
                                                background: (Array.isArray(productForm.tax) ? productForm.tax : (productForm.tax ? [productForm.tax] : [])).includes(tr.id) ? "var(--accent-secondary)" : "var(--bg-input)",
                                                color: (Array.isArray(productForm.tax) ? productForm.tax : (productForm.tax ? [productForm.tax] : [])).includes(tr.id) ? "#000" : "var(--text-secondary)",
                                                border: (Array.isArray(productForm.tax) ? productForm.tax : (productForm.tax ? [productForm.tax] : [])).includes(tr.id) ? "none" : "1px solid var(--border-primary)"
                                            }}
                                        >
                                            {tr.name} ({tr.rate}%)
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {modalTab === "advanced" && (
                        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>HSN/SAC Code (Optional)</div>
                                <input className="input-field" placeholder="HSN/SAC Code" value={productForm.hsn || ""} onChange={(e) => setProductForm({ ...productForm, hsn: e.target.value.toUpperCase() })} onKeyDown={(e) => e.key === "Enter" && saveProduct(false)} />
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <input type="checkbox" id="isDefault" checked={productForm.isDefault} onChange={(e) => setProductForm({ ...productForm, isDefault: e.target.checked })} />
                                <label htmlFor="isDefault" style={{ fontSize: "14px" }}>Include in New Invoices by default</label>
                            </div>

                            <div>
                                <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Description</div>
                                <textarea className="input-field" placeholder="Item Description" style={{ height: "60px", paddingTop: "12px", resize: "none" }} value={productForm.desc}
                                    onChange={(e) => setProductForm({ ...productForm, desc: e.target.value })}
                                    onKeyDown={(e) => e.key === "Enter" && saveProduct(false)}
                                />
                            </div>

                            <div style={{ border: "1px dashed var(--border-primary)", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
                                {productForm.image ? (
                                    <div style={{ position: "relative" }}>
                                        <img src={productForm.image} style={{ width: "80px", height: "80px", borderRadius: "10px", objectFit: "cover" }} />
                                        <button onClick={() => setProductForm({ ...productForm, image: null })} style={{ position: "absolute", top: -10, right: "calc(50% - 40px)", background: "#ef4444", color: "#fff", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", zIndex: 10 }}>✕</button>
                                    </div>
                                ) : (
                                    <label style={{ cursor: "pointer" }}>
                                        <div style={{ fontSize: "24px", marginBottom: "8px" }}>🖼️</div>
                                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "bold" }}>UPGRADE WITH IMAGE</div>
                                        <input type="file" hidden accept="image/*" onChange={async (e) => {
                                            if (e.target.files[0]) {
                                                const reader = new FileReader();
                                                reader.onload = async (re) => {
                                                    const compressed = await compressImage(re.target.result);
                                                    setProductForm({ ...productForm, image: compressed });
                                                };
                                                reader.readAsDataURL(e.target.files[0]);
                                            }
                                        }} />
                                    </label>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    {editingProductId ? (
                        <button onClick={() => { setShowModal(null); setDeleteConfirm({ type: "product", id: editingProductId, name: productForm.name }); }} className="secondary-btn" style={{ flex: 1, padding: "16px", color: "#ef4444", border: "1px solid #ef4444" }}>Delete</button>
                    ) : (
                        <button onClick={() => saveProduct(true)} className="secondary-btn" style={{ flex: 1, padding: "16px", color: "var(--accent-primary)" }}>+ Add Another</button>
                    )}
                    <button onClick={() => saveProduct(false)} className="primary-btn" style={{ flex: 2, padding: "16px" }}>{editingProductId ? "Update Item" : "Save Item"}</button>
                </div>
            </div>
        </div>
    );
};
