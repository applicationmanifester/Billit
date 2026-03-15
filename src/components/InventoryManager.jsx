import React from "react";

export const InventoryManager = ({
    inventoryTitle,
    editingInventoryTitle,
    setEditingInventoryTitle,
    setInventoryTitle,
    downloadInventoryPDF,
    shareInventoryPDF,
    setProductForm,
    setEditingProductId,
    setShowModal,
    products,
    setProducts,
    setDeleteConfirm,
    fmt
}) => {
    return (
        <div style={{ padding: "16px" }} className="animate-slide-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                {editingInventoryTitle ? (
                    <input autoFocus onBlur={() => { setEditingInventoryTitle(false); localStorage.setItem("billit_inventoryTitle", JSON.stringify(inventoryTitle)); }} className="input-field" style={{ background: "none", border: "none", color: "var(--accent-primary)", fontSize: "18px", fontWeight: "bold", width: "100%" }} value={inventoryTitle} onChange={(e) => setInventoryTitle(e.target.value)} />
                ) : (
                    <h2 onClick={() => setEditingInventoryTitle(true)} style={{ margin: 0, fontSize: "18px", color: "var(--accent-primary)" }}>{inventoryTitle} ✏️</h2>
                ) || <h2>{inventoryTitle} ✏️</h2>}
                <div style={{ display: "flex", gap: "12px" }}>
                    <button onClick={downloadInventoryPDF} className="secondary-btn" style={{ padding: "8px 12px", border: "1px solid var(--accent-primary)", color: "var(--accent-primary)", background: "none", fontSize: "12px", borderRadius: "8px" }}>Download</button>
                    <button onClick={shareInventoryPDF} className="secondary-btn" style={{ padding: "8px 12px", border: "1px solid var(--accent-primary)", color: "var(--accent-primary)", background: "none", fontSize: "12px", borderRadius: "8px" }}>Share</button>
                </div>
            </div>
            <button onClick={() => { setProductForm({ name: "", price: "", isDefault: false }); setEditingProductId(null); setShowModal("product"); }} style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "none", border: `2px dashed var(--border-primary)`, color: "var(--accent-primary)", fontWeight: "bold", marginBottom: "20px" }}>+ Add to Inventory</button>
            {products.map(p => (
                <div key={p.id} className="premium-card" style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                        {p.image && <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--bg-input)", overflow: "hidden", marginRight: "10px" }}><img src={p.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>}
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div style={{ fontSize: "15px", fontWeight: "bold" }}>{p.name}</div>
                                {p.isDefault && <span style={{ fontSize: "10px", background: "var(--border-accent)", color: "var(--accent-primary)", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>DEFAULT</span>}
                            </div>
                            <div style={{ fontSize: "14px", color: "var(--accent-primary)", fontWeight: "bold", marginTop: "2px" }}>{fmt(p.price)}</div>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => { setProductForm(p); setEditingProductId(p.id); setShowModal("product"); }} style={{
                            padding: "8px 12px", borderRadius: "10px", background: "var(--accent-primary)", color: "#000", border: "none", fontWeight: "bold", fontSize: "12px", cursor: "pointer", transition: "all 0.2s"
                        }}>Edit</button>
                        <button onClick={() => setDeleteConfirm({ type: "product", id: p.id, name: p.name })} style={{
                            padding: "8px 12px", borderRadius: "10px", background: "#ef4444", color: "#fff", border: "none", fontWeight: "bold", fontSize: "12px", cursor: "pointer", transition: "all 0.2s"
                        }}>Delete</button>
                    </div>
                </div>
            ))}
            {products.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">📦</div>
                    <div className="empty-state-title">Your inventory is empty</div>
                    <p className="empty-state-text">Add your products or services to speed up invoice creation with pre-filled details.</p>
                    <button onClick={() => { setProductForm({ name: "", price: "", isDefault: false }); setEditingProductId(null); setShowModal("product"); }} className="primary-btn">Add First Item</button>
                </div>
            )}
        </div>
    );
};
