import React from "react";

export const InvoiceViewModal = ({
    showModal, setShowModal, selectedInvoice, setSelectedInvoice,
    setForm, getClient, fmt, totalWithTax, itemTaxTotal, taxRates,
    downloadReceipt, printReceipt, printReceiptThermal, shareReceipt, shareReceiptThermal, setDeleteConfirm,
    updateStatus, recordPayment, showToast, seller = {}
}) => {
    if (showModal !== "view" || !selectedInvoice) return null;

    const inv = selectedInvoice;
    const client = getClient(inv.clientId);
    const subtotal = inv.items.reduce((s, i) => s + (i.qty * i.price), 0);
    const taxes = inv.items.reduce((s, i) => s + itemTaxTotal(i, taxRates), 0);
    const total = totalWithTax(inv.items, taxRates);
    const paidSoFar = Math.round((Number(inv.amountPaid) || 0) * 100) / 100;
    const outstanding = Math.round((total - paidSoFar) * 100) / 100;
    const [payAmount, setPayAmount] = React.useState("");
    
    const statuses = ["draft", "sent", "paid", "overdue"];

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }} onClick={(e) => e.target === e.currentTarget && setShowModal(null)}>
            <div className="premium-card animate-slide-up" style={{ borderRadius: "20px", width: "100%", maxWidth: "480px", padding: "24px 20px 40px" }}>
                <div style={{ width: "40px", height: "4px", background: "var(--border-primary)", borderRadius: "2px", margin: "0 auto 24px" }} />

                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                    <button onClick={() => setShowModal(null)} style={{ background: "rgba(0,0,0,0.05)", border: "none", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-primary)" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                        <div style={{ fontSize: "12px", color: "var(--accent-primary)", fontWeight: "bold" }}>{inv.id}</div>
                        <h2 style={{ margin: 0, fontSize: "20px" }}>Invoice Details</h2>
                    </div>
                </div>

                <div style={{ background: "var(--bg-input)", borderRadius: "16px", padding: "16px", marginBottom: "20px", border: `1px solid var(--border-primary)` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                            <div style={{ fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>Client</div>
                            <div style={{ fontWeight: "bold", fontSize: "15px" }}>{client?.name || "Unknown"}</div>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{client?.email}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px" }}>Status</div>
                            <span className="badge" style={{ 
                                background: `var(--status-${inv.status})`, 
                                padding: "4px 14px", 
                                fontSize: "11px"
                            }}>{inv.status}</span>
                        </div>
                        <div>
                            <div style={{ fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>Date / Time</div>
                            <div style={{ fontSize: "14px" }}>{inv.date} <span style={{ opacity: 0.6, fontSize: "12px" }}>{inv.time}</span></div>
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
                    {inv.items.map((item, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "14px" }}>
                            <span style={{ color: "var(--text-secondary)", flex: 1, marginRight: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.desc} <span style={{ opacity: 0.6, fontSize: "11px" }}>x{item.qty}</span>
                            </span>
                            <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>{fmt(Math.round(item.qty * item.price * 100) / 100)}</span>
                        </div>
                    ))}
                    <div style={{ height: "1px", background: "var(--border-primary)", margin: "14px 0", opacity: 0.4 }} />

                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Subtotal</span>
                        <span style={{ fontWeight: "600" }}>{fmt(inv.items.reduce((s, i) => s + Math.round(i.qty * i.price * 100) / 100, 0))}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", paddingBottom: "12px", borderBottom: `1px solid var(--border-primary)` }}>
                        <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Taxes</span>
                        <span style={{ fontWeight: "600" }}>{fmt(inv.items.reduce((s, i) => s + itemTaxTotal(i, taxRates), 0))}</span>
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

                {seller.upiId && (
                    <div style={{ 
                        background: "rgba(245, 200, 66, 0.05)", 
                        border: "1px solid var(--border-primary)", 
                        borderRadius: "16px", 
                        padding: "16px", 
                        marginBottom: "24px", 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "16px" 
                    }}>
                        <div style={{ background: "#fff", padding: "8px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                                    `upi://pay?pa=${seller.upiId}&pn=${encodeURIComponent(seller.name || "Merchant")}&am=${total}&tn=${encodeURIComponent(inv.id)}&cu=${inv.currency || "INR"}`
                                )}`}
                                style={{ width: "80px", height: "80px" }}
                                alt="UPI QR Code"
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "10px", color: "var(--accent-primary)", fontWeight: "bold", textTransform: "uppercase", marginBottom: "4px" }}>⚡ Dynamic UPI Payment</div>
                            <div style={{ fontSize: "13px", fontWeight: "bold", color: "var(--text-primary)" }}>Scan to Pay</div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)", wordBreak: "break-all", marginTop: "2px" }}>{seller.upiId}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "bold", marginTop: "4px" }}>Amount: <span style={{ color: "var(--text-primary)" }}>{fmt(total)}</span></div>
                        </div>
                    </div>
                )}

                <div style={{ background: "var(--bg-input)", borderRadius: "16px", padding: "16px", marginBottom: "20px", border: `1px solid var(--border-primary)` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Paid so far</span>
                        <span style={{ fontWeight: "600" }}>{fmt(paidSoFar)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: outstanding > 0 ? "var(--status-overdue)" : "var(--status-paid)", fontSize: "13px", fontWeight: "bold" }}>
                            {outstanding > 0 ? "Balance due" : "Fully paid"}
                        </span>
                        <span style={{ fontWeight: "bold", color: outstanding > 0 ? "var(--status-overdue)" : "var(--status-paid)" }}>{fmt(outstanding)}</span>
                    </div>
                </div>

                {inv.status !== "paid" && (
                    <div style={{ background: "var(--bg-input)", borderRadius: "16px", padding: "16px", marginBottom: "24px", border: `1px solid var(--border-primary)` }}>
                        <div style={{ fontSize: "10px", color: "var(--accent-primary)", fontWeight: "bold", textTransform: "uppercase", marginBottom: "12px" }}>Record Payment</div>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <input
                                type="number"
                                min="0"
                                max={outstanding}
                                step="0.01"
                                placeholder={`Amount (${fmt(outstanding)} due)`}
                                value={payAmount}
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    if (raw === "" || raw === "-") { setPayAmount(raw); return; }
                                    const n = Number(raw);
                                    const capped = Math.min(n, outstanding);
                                    setPayAmount(String(capped));
                                }}
                                className="input-field"
                                style={{ flex: 1 }}
                            />
                            <button
                                onClick={() => {
                                    const amt = Math.min(Number(payAmount) || 0, outstanding);
                                    setPayAmount("");
                                    recordPayment(inv.id, amt);
                                }}
                                className="primary-btn"
                                style={{ padding: "0 18px", borderRadius: "12px", fontWeight: "bold", fontSize: "12px" }}
                            >Add</button>
                        </div>
                        {outstanding > 0 && (
                            <button
                                onClick={() => recordPayment(inv.id, outstanding)}
                                className="secondary-btn"
                                style={{ width: "100%", marginTop: "10px", padding: "10px", borderRadius: "12px", border: "1px solid var(--border-primary)", fontSize: "11px", fontWeight: "bold" }}
                            >Mark Full Payment ({fmt(outstanding)})</button>
                        )}
                    </div>
                )}

                <div style={{ marginBottom: "20px" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)", fontWeight: "bold", textTransform: "uppercase", marginBottom: "12px" }}>Update Status</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                        {statuses.map(s => {
                            const isActive = inv.status === s;
                            const activeBg = `var(--status-${s})`;

                            return (
                                <button
                                    key={s}
                                    onClick={() => {
                                        if (inv.status === s) return;
                                        updateStatus(inv.id, s);
                                    }}
                                    className={isActive ? "" : "secondary-btn"}
                                    style={{
                                        padding: "10px 4px",
                                        fontSize: "12px",
                                        textTransform: "capitalize",
                                        borderRadius: "12px",
                                        border: isActive ? "none" : `1px solid var(--border-primary)`,
                                        background: isActive ? activeBg : "var(--bg-card)",
                                        color: isActive ? "#000" : "var(--text-secondary)",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    {s}
                                </button>
                            );
                        })}
                    </div>
                    <div style={{ height: "1px", background: "var(--border-primary)", margin: "20px 0 0" }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                    <button 
                        onClick={() => {
                            const message = `Hi ${client?.name || "Customer"},\n\nProfessional Invoice *${inv.id}* is ready! ✨\n\n📅 *Date:* ${inv.date}\n💰 *Total Amount:* ${fmt(total)}\n💳 *Status:* ${inv.status.toUpperCase()}\n\nPlease find the detailed professional invoice attached in the following share.\n\nThank you for choosing *${seller?.name || "Billit"}*! \n\n[Invoiced beautifully with Billit]`;
                            const phone = client?.phone?.replace(/[^0-9]/g, "") || "";
                            const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
                            window.open(url, "_blank");
                        }} 
                        className="primary-btn" 
                        style={{ 
                            padding: "16px", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center", 
                            gap: "10px",
                            background: "#25D366", // WhatsApp Green
                            border: "none",
                            borderRadius: "14px",
                            boxShadow: "0 4px 12px rgba(37, 211, 102, 0.2)"
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        Send Detailed WhatsApp Link
                    </button>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <button onClick={() => shareReceipt(inv)} className="secondary-btn" style={{ padding: "14px 4px", fontWeight: "bold", fontSize: "12px", borderRadius: "12px", border: "1px solid var(--border-primary)", background: "var(--bg-card)" }}>Share Standard</button>
                        <button onClick={() => shareReceiptThermal(inv)} className="secondary-btn" style={{ padding: "14px 4px", fontWeight: "bold", fontSize: "12px", borderRadius: "12px", border: "1px solid var(--border-primary)", background: "var(--bg-card)" }}>Share Thermal</button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                        <button onClick={() => downloadReceipt(inv)} className="secondary-btn" style={{ padding: "10px 4px", fontSize: "11px", borderRadius: "10px", opacity: 0.8 }}>Download</button>
                        <button onClick={() => printReceipt(inv)} className="secondary-btn" style={{ padding: "10px 4px", fontSize: "11px", borderRadius: "10px", opacity: 0.8 }}>A4 Print</button>
                        <button onClick={() => printReceiptThermal(inv)} className="secondary-btn" style={{ padding: "10px 4px", fontSize: "11px", borderRadius: "10px", opacity: 0.8 }}>Thermal Print</button>
                    </div>
                </div>

                <div style={{ paddingBottom: "10px" }}>
                    <button onClick={() => setDeleteConfirm({ type: "single", id: inv.id })} className="secondary-btn" style={{
                        width: "100%", padding: "14px", color: "#ef4444", border: "1px solid #ef444433", fontWeight: "bold", borderRadius: "12px"
                    }}>Delete Invoice</button>
                </div>
            </div>
        </div>
    );
};
