import React from "react";

export const ClientModal = ({ showModal, setShowModal, clientForm, setClientForm, selectedClient, saveClient }) => {
    if (showModal !== "client") return null;

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={(e) => e.target === e.currentTarget && setShowModal(null)}>
            <div className="premium-card animate-slide-up" style={{ borderRadius: "20px 20px 0 0", width: "100%", maxWidth: "480px", padding: "24px 20px 40px" }}>
                <h2 style={{ marginTop: 0 }}>{selectedClient ? "Edit Client" : "New Client"}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
                    <input className="input-field" placeholder="Client Name" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} />
                    <input className="input-field" placeholder="Email Address" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
                    <input className="input-field" placeholder="Phone Number" value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} />
                    <textarea className="input-field" placeholder="Address" style={{ height: "100px", paddingTop: "12px" }} value={clientForm.address} onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })} />
                </div>
                <button onClick={saveClient} className="primary-btn" style={{ width: "100%", padding: "16px" }}>Save Client</button>
            </div>
        </div>
    );
};

export const ProductModal = ({ showModal, setShowModal, productForm, setProductForm, editingProductId, saveProduct, compressImage }) => {
    if (showModal !== "product") return null;

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={(e) => e.target === e.currentTarget && setShowModal(null)}>
            <div className="premium-card animate-slide-up" style={{ borderRadius: "20px 20px 0 0", width: "100%", maxWidth: "480px", padding: "24px 20px 40px" }}>
                <h2 style={{ marginTop: 0 }}>{editingProductId ? "Edit Item" : "Add to Inventory"}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
                    <input className="input-field" placeholder="Item Name" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                    <input type="number" className="input-field" placeholder="Price" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} />

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <input type="checkbox" id="isDefault" checked={productForm.isDefault} onChange={(e) => setProductForm({ ...productForm, isDefault: e.target.checked })} />
                        <label htmlFor="isDefault" style={{ fontSize: "14px" }}>Include in New Invoices by default</label>
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
                <button onClick={saveProduct} className="primary-btn" style={{ width: "100%", padding: "16px" }}>Save Item</button>
            </div>
        </div>
    );
};
