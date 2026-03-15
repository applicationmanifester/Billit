import React from "react";

export const Dashboard = ({ statsMemo, fmt, invoices, getClient, totalWithTax, taxRates, setSelectedInvoice, setShowModal, setTab }) => {
    return (
        <div className="animate-slide-up">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
                <div className="premium-card" style={{ padding: "12px" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>Revenue</div>
                    <div style={{ fontSize: "16px", fontWeight: "bold", color: "var(--status-paid)" }}>{fmt(statsMemo.paid)}</div>
                </div>
                <div className="premium-card" style={{ padding: "12px" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>Pretax</div>
                    <div style={{ fontSize: "16px", fontWeight: "bold", color: "var(--text-primary)" }}>{fmt(statsMemo.pretax)}</div>
                </div>
                <div className="premium-card" style={{ padding: "12px" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>Taxes</div>
                    <div style={{ fontSize: "16px", fontWeight: "bold", color: "var(--accent-primary)" }}>{fmt(statsMemo.tax)}</div>
                </div>
                <div className="premium-card" style={{ padding: "12px" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>Pending</div>
                    <div style={{ fontSize: "16px", fontWeight: "bold", color: "var(--status-pending)" }}>{fmt(statsMemo.pending)}</div>
                </div>
                <div className="premium-card" style={{ padding: "12px" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>Overdue</div>
                    <div style={{ fontSize: "16px", fontWeight: "bold", color: "var(--status-overdue)" }}>{fmt(statsMemo.overdueAmt)}</div>
                </div>
                <div className="premium-card" style={{ padding: "12px" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>Drafts</div>
                    <div style={{ fontSize: "16px", fontWeight: "bold", color: "var(--status-draft)" }}>{fmt(statsMemo.draftTotal)}</div>
                </div>
            </div>

            <div className="premium-card" style={{ margin: "16px 0", background: "var(--border-accent)", border: "1px solid var(--border-accent)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase" }}>Total Collected</span>
                    <span style={{ fontSize: "11px", color: "var(--status-paid)", fontWeight: "bold" }}>{statsMemo.total > 0 ? Math.round((statsMemo.paid / statsMemo.total) * 100) : 0}%</span>
                </div>
                <div style={{ fontSize: "28px", fontWeight: "bold" }}>{fmt(statsMemo.paid)} <span style={{ fontSize: "14px", color: "var(--text-muted)", fontWeight: "normal" }}>/ {fmt(statsMemo.total)}</span></div>
                <div style={{ height: "6px", background: "var(--border-primary)", borderRadius: "3px", marginTop: "12px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${statsMemo.total > 0 ? (statsMemo.paid / statsMemo.total) * 100 : 0}%`, background: "var(--status-paid)" }} />
                </div>
            </div>

            <div style={{ marginTop: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                    <h3 style={{ margin: 0, fontSize: "15px" }}>Recent Invoices</h3>
                    <button onClick={() => setTab("bills")} style={{ background: "none", border: "none", color: "var(--accent-primary)", fontSize: "12px", cursor: "pointer" }}>View All →</button>
                </div>
                {(invoices || []).slice(-4).reverse().map(inv => (
                    <div key={inv.id} className="premium-card" style={{ padding: "16px", marginBottom: "12px", cursor: "pointer" }} onClick={() => { setSelectedInvoice(inv); setShowModal("view"); }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: "11px", color: "var(--accent-primary)", fontWeight: "bold", marginBottom: "2px" }}>{inv.id}</div>
                                <div style={{ fontSize: "15px", fontWeight: "600" }}>{getClient(inv.clientId)?.name || "Unknown"}</div>
                                <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{inv.date}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "4px" }}>{fmt(totalWithTax(inv.items, taxRates))}</div>
                                <span className="badge" style={{ background: `var(--status-${inv.status})` }}>{inv.status}</span>
                            </div>
                        </div>
                    </div>
                ))}
                {invoices.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Start by creating your first invoice!</div>}
            </div>
        </div>
    );
};
