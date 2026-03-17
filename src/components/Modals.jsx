import React from "react";

export const ClientModal = ({ showModal, setShowModal, clientForm, setClientForm, selectedClient, saveClient }) => {
    if (showModal !== "client") return null;

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }} onClick={(e) => e.target === e.currentTarget && setShowModal(null)}>
            <div className="premium-card animate-slide-up" style={{ borderRadius: "20px", width: "100%", maxWidth: "480px", padding: "24px 20px 40px" }}>
                <h2 style={{ marginTop: 0 }}>{selectedClient ? "Edit Client" : "New Client"}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Client Name</div>
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
                        <textarea className="input-field" placeholder="Address" style={{ height: "100px", paddingTop: "12px" }} value={clientForm.address}
                            onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                            onKeyDown={(e) => e.key === "Enter" && saveClient()}
                        />
                    </div>
                </div>
                <button onClick={saveClient} className="primary-btn" style={{ width: "100%", padding: "16px" }}>Save Client</button>
            </div>
        </div>
    );
};

export const ProductModal = ({ showModal, setShowModal, productForm, setProductForm, editingProductId, saveProduct, compressImage, taxRates, itemTaxTotal, calculateBaseFromTotal }) => {
    if (showModal !== "product") return null;

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }} onClick={(e) => e.target === e.currentTarget && setShowModal(null)}>
            <div className="premium-card animate-slide-up" style={{ borderRadius: "20px", width: "100%", maxWidth: "480px", padding: "24px 20px 40px" }}>
                <h2 style={{ marginTop: 0 }}>{editingProductId ? "Edit Item" : "Add to Inventory"}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Item Name</div>
                        <input className="input-field" placeholder="Item Name" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && saveProduct(false)} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Price</div>
                            <input type="number" step="any" className="input-field" placeholder="0.00"
                                value={productForm.price === "" ? "" : Number(productForm.price.toFixed(4))}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => e.key === "Enter" && saveProduct(false)}
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    setProductForm({ ...productForm, price: raw === "" ? "" : parseFloat(raw) || 0 });
                                }}
                            />
                        </div>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Total Tax Amount</div>
                            <div style={{ padding: "8px 12px", fontSize: "14px", fontWeight: "bold", color: "var(--accent-secondary)", background: "var(--bg-input)", borderRadius: "12px", border: "1px solid var(--border-primary)", height: "42px", display: "flex", alignItems: "center" }}>
                                {Math.round(itemTaxTotal({ ...productForm, qty: 1, tax: productForm.tax || [] }, taxRates) * 100) / 100}
                            </div>
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Total Price (Incl. Tax)</div>
                        <input
                            type="number"
                            step="any"
                            className="input-field"
                            style={{ background: "var(--border-accent)" }}
                            placeholder="0.00"
                            value={productForm.price === "" ? "" : Number((Number(productForm.price || 0) + (itemTaxTotal({ ...productForm, qty: 1, tax: productForm.tax || [] }, taxRates))).toFixed(2))}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => e.key === "Enter" && saveProduct(false)}
                            onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === "") {
                                    setProductForm({ ...productForm, price: "" });
                                    return;
                                }
                                const newVal = Number(raw) || 0;
                                const base = calculateBaseFromTotal(newVal, taxRates, productForm.tax || []);
                                setProductForm({ ...productForm, price: base });
                            }}
                        />
                    </div>

                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "8px", marginLeft: "4px" }}>Default Taxes</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {taxRates.map(tr => {
                                const taxArr = Array.isArray(productForm.tax) ? productForm.tax : (productForm.tax ? [productForm.tax] : []);
                                const isActive = taxArr.includes(tr.id);
                                return (
                                    <button key={tr.id} onClick={() => {
                                        setProductForm({ ...productForm, tax: isActive ? taxArr.filter(id => id !== tr.id) : [...taxArr, tr.id] });
                                    }} style={{
                                        padding: "6px 12px", borderRadius: "10px", fontSize: "11px", fontWeight: "bold",
                                        border: `1px solid ${isActive ? "var(--accent-primary)" : "var(--border-primary)"}`,
                                        background: isActive ? "var(--accent-primary)" : "none",
                                        color: isActive ? "#000" : "var(--text-secondary)",
                                        cursor: "pointer"
                                    }}>{tr.label} ({tr.rate}%)</button>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <input type="checkbox" id="isDefault" checked={productForm.isDefault} onChange={(e) => setProductForm({ ...productForm, isDefault: e.target.checked })} />
                        <label htmlFor="isDefault" style={{ fontSize: "14px" }}>Include in New Invoices by default</label>
                    </div>

                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Description</div>
                        <textarea className="input-field" placeholder="Item Description" style={{ height: "60px", paddingTop: "12px" }} value={productForm.desc}
                            onChange={(e) => setProductForm({ ...productForm, desc: e.target.value })}
                            onKeyDown={(e) => e.key === "Enter" && saveProduct(false)}
                        />
                    </div>

                    <div style={{ border: "1px dashed var(--border-primary)", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
                        {productForm.image ? (
                            <div style={{ position: "relative" }}>
                                <img src={productForm.image} style={{ width: "80px", height: "80px", borderRadius: "10px", objectFit: "cover" }} />
                                <button onClick={() => setProductForm({ ...productForm, image: null })} style={{ position: "absolute", top: -10, right: "calc(50% - 50px)", background: "#ef4444", color: "#fff", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer" }}>✕</button>
                            </div>
                        ) : (
                            <label style={{ cursor: "pointer" }}>
                                <div style={{ fontSize: "24px", marginBottom: "8px" }}>🖼️</div>
                                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Upload Product Image</div>
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
                <div style={{ display: "flex", gap: "10px" }}>
                    {!editingProductId && (
                        <button onClick={() => saveProduct(true)} className="secondary-btn" style={{ flex: 1, padding: "16px", color: "var(--accent-primary)" }}>+ Add Another</button>
                    )}
                    <button onClick={() => saveProduct(false)} className="primary-btn" style={{ flex: 1, padding: "16px" }}>{editingProductId ? "Update Item" : "Save Item"}</button>
                </div>
            </div>
        </div>
    );
};
