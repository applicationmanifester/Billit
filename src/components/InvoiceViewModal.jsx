import React from "react";

export const InvoiceViewModal = ({
    showModal, setShowModal, selectedInvoice, setSelectedInvoice,
    setForm, getClient, fmt, totalWithTax, itemTaxTotal, taxRates,
    downloadReceipt, printReceipt, shareReceipt, setDeleteConfirm,
    updateStatus, showToast
}) => {
    if (showModal !== "view" || !selectedInvoice) return null;

    const inv = selectedInvoice;
    const client = getClient(inv.clientId);
    const subtotal = inv.items.reduce((s, i) => s + (i.qty * i.price), 0);
    const taxes = inv.items.reduce((s, i) => s + itemTaxTotal(i, taxRates), 0);
    const total = totalWithTax(inv.items, taxRates);

    const statuses = ["draft", "sent", "paid", "overdue"];

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={(e) => e.target === e.currentTarget && setShowModal(null)}>
            <div className="premium-card animate-slide-up" style={{ borderRadius: "20px 20px 0 0", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto", padding: "24px 20px 40px" }}>
                <div style={{ width: "40px", height: "4px", background: "var(--border-primary)", borderRadius: "2px", margin: "0 auto 24px" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <div>
                        <div style={{ fontSize: "12px", color: "var(--accent-primary)", fontWeight: "bold" }}>{inv.id}</div>
                        <h2 style={{ margin: 0, fontSize: "20px" }}>Invoice Details</h2>
                    </div>
                    <button onClick={() => setShowModal(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>✕</button>
                </div>

                <div style={{ background: "var(--bg-input)", borderRadius: "16px", padding: "16px", marginBottom: "20px", border: `1px solid var(--border-primary)` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                            <div style={{ fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>Client</div>
                            <div style={{ fontWeight: "bold", fontSize: "15px" }}>{client?.name || "Unknown"}</div>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{client?.email}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>Status</div>
                            <span className="badge" style={{ background: `var(--status-${inv.status})`, padding: "4px 12px" }}>{inv.status}</span>
                        </div>
                        <div>
                            <div style={{ fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>Date</div>
                            <div style={{ fontSize: "14px" }}>{inv.date}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>Due Date</div>
                            <div style={{ fontSize: "14px" }}>{inv.due}</div>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: "24px" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)", fontWeight: "bold", textTransform: "uppercase", marginBottom: "12px" }}>Items</div>
                    {inv.items.map((item, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid var(--border-primary)` }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: "600", fontSize: "14px" }}>{item.desc}</div>
                                <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{item.qty} × {fmt(item.price)}</div>
                            </div>
                            <div style={{ fontWeight: "bold", fontSize: "14px" }}>{fmt(item.qty * item.price)}</div>
                        </div>
                    ))}
                </div>

                <div style={{ background: "var(--bg-input)", borderRadius: "16px", padding: "16px", marginBottom: "24px", border: `1px solid var(--border-primary)` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Subtotal</span>
                        <span style={{ fontWeight: "600" }}>{fmt(subtotal)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", paddingBottom: "12px", borderBottom: `1px solid var(--border-primary)` }}>
                        <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Taxes</span>
                        <span style={{ fontWeight: "600" }}>{fmt(taxes)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: "bold", fontSize: "16px" }}>Total</span>
                        <span style={{ fontWeight: "900", fontSize: "20px", color: "var(--accent-primary)" }}>{fmt(total)}</span>
                    </div>
                </div>

                {inv.notes && (
                    <div style={{ marginBottom: "24px" }}>
                        <div style={{ fontSize: "10px", color: "var(--text-secondary)", fontWeight: "bold", textTransform: "uppercase", marginBottom: "8px" }}>Notes</div>
                        <div style={{ fontSize: "13px", color: "var(--text-secondary)", background: "var(--bg-input)", padding: "12px", borderRadius: "12px", border: `1px solid var(--border-primary)`, whiteSpace: "pre-wrap" }}>{inv.notes}</div>
                    </div>
                )}

                <div style={{ marginBottom: "20px" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)", fontWeight: "bold", textTransform: "uppercase", marginBottom: "12px" }}>Update Status</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                        {statuses.map(s => (
                            <button
                                key={s}
                                onClick={() => updateStatus(inv.id, s)}
                                className={inv.status === s ? "primary-btn" : "secondary-btn"}
                                style={{ padding: "8px 4px", fontSize: "11px", textTransform: "capitalize", opacity: inv.status === s ? 1 : 0.7 }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: "12px" }}>
                    <button onClick={() => downloadReceipt(inv)} className="primary-btn" style={{ padding: "14px", width: "100%" }}>⬇️ Download Receipt</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "24px" }}>
                    <button onClick={() => printReceipt(inv)} className="secondary-btn" style={{ padding: "12px", fontSize: "11px" }}>Print</button>
                    <button onClick={() => shareReceipt(inv)} className="secondary-btn" style={{ padding: "12px", fontSize: "11px" }}>Share</button>
                    <button onClick={() => setDeleteConfirm({ type: "single", id: inv.id })} className="secondary-btn" style={{ padding: "12px", fontSize: "11px", color: "#ef4444", border: "1px solid #ef4444" }}>Delete</button>
                </div>
            </div>
        </div>
    );
};
