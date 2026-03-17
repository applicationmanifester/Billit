import React from "react";

export const ClientManager = ({ clients, setClients, setClientForm, setSelectedClient, setShowModal, invoices, fmt, setDeleteConfirm, totalWithTax, taxRates }) => {
    return (
        <div style={{ padding: "16px" }} className="animate-slide-up">
            <button onClick={() => { setClientForm({ name: "", email: "", phone: "", address: "" }); setSelectedClient(null); setShowModal("client"); }} style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "none", border: `2px dashed var(--border-primary)`, color: "var(--accent-primary)", fontWeight: "bold", marginBottom: "20px" }}>+ Add New Client</button>
            {clients.map(c => {
                const clientInvoices = invoices.filter(inv => inv.clientId === c.id);
                const ltv = clientInvoices.reduce((sum, inv) => sum + (inv.totalAmount || totalWithTax(inv.items, taxRates)), 0);
                return (
                    <div key={c.id} className="premium-card" style={{ marginBottom: "12px", padding: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: "16px", fontWeight: "bold" }}>{c.name}</div>
                                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>{c.email}</div>
                                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{c.phone}</div>
                                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                                    <div style={{ fontSize: "10px", padding: "4px 8px", background: "var(--bg-primary)", borderRadius: "8px", color: "var(--text-secondary)" }}>{clientInvoices.length} Invoices</div>
                                    <div style={{ fontSize: "10px", padding: "4px 8px", background: "var(--bg-primary)", borderRadius: "8px", color: "var(--accent-primary)", fontWeight: "bold" }}>LTV: {fmt(ltv)}</div>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <button onClick={() => { setClientForm(c); setSelectedClient(c); setShowModal("client"); }} style={{
                                    padding: "8px 12px", borderRadius: "10px", background: "var(--accent-primary)", color: "#000", border: "none", fontWeight: "bold", fontSize: "12px", cursor: "pointer", transition: "all 0.2s"
                                }}>Edit</button>
                                <button onClick={() => setDeleteConfirm({ type: "client", id: c.id, name: c.name })} style={{
                                    padding: "8px 12px", borderRadius: "10px", background: "#ef4444", color: "#fff", border: "none", fontWeight: "bold", fontSize: "12px", cursor: "pointer", transition: "all 0.2s"
                                }}>Delete</button>
                            </div>
                        </div>
                    </div>
                );
            })}
            {clients.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <div className="empty-state-title">No clients yet</div>
                    <p className="empty-state-text">Add your clients here to manage their information and create invoices for them quickly.</p>
                    <button onClick={() => { setClientForm({ name: "", email: "", phone: "", address: "" }); setSelectedClient(null); setShowModal("client"); }} className="primary-btn">Add First Client</button>
                </div>
            )}
        </div>
    );
};
