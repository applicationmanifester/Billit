import React from "react";

export const ClientManager = ({ clients, setClients, setClientForm, setSelectedClient, setShowModal, invoices, fmt, setDeleteConfirm, totalWithTax, taxRates, search, defaultClientId, setDefaultClientId, showToast, downloadClientsPDF, printClientsPDF, shareClientsPDF }) => {
    const filteredClients = clients.filter(c => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (c.name || "").toLowerCase().includes(s) || 
               (c.email || "").toLowerCase().includes(s) || 
               (c.phone || "").toLowerCase().includes(s) || 
               (c.gstin || "").toLowerCase().includes(s);
    });

    return (
        <div style={{ padding: "16px" }} className="animate-slide-up">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button onClick={printClientsPDF} className="secondary-btn" style={{ flex: "1 1 auto", minWidth: "80px", padding: "10px", border: "1px solid var(--accent-primary)", color: "var(--accent-primary)", background: "none", fontSize: "11px", borderRadius: "8px" }}>Print List</button>
                    <button onClick={downloadClientsPDF} className="secondary-btn" style={{ flex: "1 1 auto", minWidth: "80px", padding: "10px", border: "1px solid var(--accent-primary)", color: "var(--accent-primary)", background: "none", fontSize: "11px", borderRadius: "8px" }}>Download</button>
                    <button onClick={shareClientsPDF} className="secondary-btn" style={{ flex: "1 1 auto", minWidth: "80px", padding: "10px", border: "1px solid var(--accent-primary)", color: "var(--accent-primary)", background: "none", fontSize: "11px", borderRadius: "8px" }}>Share PDF</button>
                </div>
                <button onClick={() => { setClientForm({ name: "", email: "", phone: "", address: "", gstin: "", locationUrl: "" }); setSelectedClient(null); setShowModal("client"); }} style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "none", border: `2px dashed var(--border-primary)`, color: "var(--accent-primary)", fontWeight: "bold" }}>+ Add New Client</button>
            </div>
            {filteredClients.map(c => {
                const clientInvoices = invoices.filter(inv => inv.clientId === c.id);
                const ltv = clientInvoices.reduce((sum, inv) => sum + (inv.totalAmount || totalWithTax(inv.items, taxRates)), 0);
                return (
                    <div key={c.id} className="premium-card" style={{ marginBottom: "12px", padding: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <div style={{ fontSize: "16px", fontWeight: "bold" }}>{c.name}</div>
                                    {c.gstin && <div style={{ fontSize: "9px", padding: "2px 6px", background: "rgba(255,193,7,0.1)", color: "#ffc107", borderRadius: "4px", border: "1px solid rgba(255,193,7,0.2)" }}>GST: {c.gstin}</div>}
                                </div>
                                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>{c.email}</div>
                                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{c.phone}</div>
                                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                                    <div style={{ fontSize: "10px", padding: "4px 8px", background: "var(--bg-primary)", borderRadius: "8px", color: "var(--text-secondary)" }}>{clientInvoices.length} Invoices</div>
                                    <div style={{ fontSize: "10px", padding: "4px 8px", background: "var(--bg-primary)", borderRadius: "8px", color: "var(--accent-primary)", fontWeight: "bold" }}>LTV: {fmt(ltv)}</div>
                                </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {String(defaultClientId) === String(c.id) ? (
                                    <button onClick={() => { setDefaultClientId(""); showToast("Default customer removed"); }} style={{ 
                                        padding: "4px 8px", borderRadius: "8px", background: "rgba(74, 222, 128, 0.1)", 
                                        color: "#4ade80", fontSize: "10px", fontWeight: "bold", textAlign: "center",
                                        border: "1px solid rgba(74, 222, 128, 0.2)", cursor: "pointer",
                                        width: "100%"
                                    }}>⭐ DEFAULT</button>
                                ) : (
                                    <button onClick={() => { setDefaultClientId(String(c.id)); showToast(`${c.name} set as default`); }} style={{
                                        padding: "8px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "1px solid var(--border-primary)", fontWeight: "bold", fontSize: "11px", cursor: "pointer", transition: "all 0.2s"
                                    }}>Set Default</button>
                                )}
                                <button onClick={() => { setClientForm(c); setSelectedClient(c); setShowModal("client"); }} style={{
                                    padding: "8px 12px", borderRadius: "10px", background: "var(--accent-primary)", color: "#000", border: "none", fontWeight: "bold", fontSize: "12px", cursor: "pointer", transition: "all 0.2s"
                                }}>Edit</button>
                                <button onClick={() => setDeleteConfirm({ type: "client", id: c.id, name: c.name })} style={{
                                    padding: "8px 12px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid #ef4444", fontWeight: "bold", fontSize: "11px", cursor: "pointer", transition: "all 0.2s"
                                }}>Delete</button>
                            </div>
                        </div>
                    </div>
                );
            })}
            {filteredClients.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">{search ? "🔍" : "👥"}</div>
                    <div className="empty-state-title">{search ? "No matches found" : "No clients yet"}</div>
                    <p className="empty-state-text">{search ? `We couldn't find any clients matching "${search}"` : "Add your clients here to manage their information and create invoices for them quickly."}</p>
                    {!search && <button onClick={() => { setClientForm({ name: "", email: "", phone: "", address: "", gstin: "" }); setSelectedClient(null); setShowModal("client"); }} className="primary-btn">Add First Client</button>}
                </div>
            )}
        </div>
    );
};
