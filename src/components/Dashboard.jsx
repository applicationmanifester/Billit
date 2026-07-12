import React from "react";

export const Dashboard = ({ statsMemo, fmt, invoices, getClient, totalWithTax, taxRates, setSelectedInvoice, setShowModal, setTab, search, seller, plan = "free", invoicesGenerated = 0 }) => {
    const limit = plan === "free" ? 100 : (plan === "pro" ? 500 : Infinity);
    const limitLabel = limit === Infinity ? "Unlimited" : limit;
    const usagePct = limit === Infinity ? 0 : (invoicesGenerated / limit) * 100;
    const filteredInvoices = (invoices || []).filter(inv => {
        if (!search) return true;
        const s = search.toLowerCase();
        const clientName = (getClient(inv.clientId)?.name || "").toLowerCase();
        return (inv.id || "").toLowerCase().includes(s) || clientName.includes(s);
    });

    return (
        <div className="animate-slide-up">
            {!search && (
                <div style={{ marginBottom: "24px" }}>
                    <div style={{ fontSize: "11px", color: "var(--accent-primary)", fontWeight: "bold", letterSpacing: "1.5px", marginBottom: "4px", opacity: 0.8 }}>
                        ✨ WELCOME BACK
                    </div>
                    <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "900", color: "var(--text-primary)" }}>{seller?.name || "My Business"}</h1>
                    
                    {/* Dynamic Insight Banner */}
                    <div style={{ 
                        marginTop: "16px", 
                        padding: "12px 16px", 
                        background: statsMemo.overdue > 0 ? "rgba(239, 68, 68, 0.08)" : "rgba(34, 197, 94, 0.08)", 
                        borderRadius: "12px", 
                        border: `1px solid ${statsMemo.overdue > 0 ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)"}`,
                        display: "flex",
                        alignItems: "center",
                        gap: "10px"
                    }}>
                        <span style={{ fontSize: "18px" }}>{statsMemo.overdue > 0 ? "🔔" : "✨"}</span>
                        <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: "500" }}>
                            {statsMemo.overdue > 0 
                                ? `You have ${fmt(statsMemo.overdue)} outstanding. ${statsMemo.counts.overdue} invoices are overdue.`
                                : statsMemo.pending > 0 
                                    ? `Everything looks great! You're expecting ${fmt(statsMemo.pending)} in incoming payments.`
                                    : "All caught up! No pending or overdue invoices at the moment."}
                        </div>
                    </div>
                </div>
            )}
            {!search && (
                <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
                        <div className="premium-card" style={{ padding: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                                <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase" }}>Revenue</div>
                                {(() => {
                                    const now = new Date();
                                    const curMonth = now.getMonth();
                                    const curYear = now.getFullYear();
                                    const lastMonth = curMonth === 0 ? 11 : curMonth - 1;
                                    const lastYear = curMonth === 0 ? curYear - 1 : curYear;
                                    
                                    const getMonthlyTotal = (m, y) => (invoices || [])
                                        .filter(inv => inv.status === "paid" && new Date(inv.date).getMonth() === m && new Date(inv.date).getFullYear() === y)
                                        .reduce((s, inv) => s + totalWithTax(inv.items, taxRates), 0);
                                    
                                    const thisMonth = getMonthlyTotal(curMonth, curYear);
                                    const prevMonth = getMonthlyTotal(lastMonth, lastYear);
                                    const diff = thisMonth - prevMonth;
                                    if (prevMonth === 0 && thisMonth === 0) return null;
                                    const isUp = diff >= 0;
                                    return (
                                        <div style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "10px", background: isUp ? "rgba(76, 175, 80, 0.1)" : "rgba(244, 67, 54, 0.1)", color: isUp ? "var(--status-paid)" : "var(--status-overdue)", fontWeight: "bold" }}>
                                            {isUp ? "↑" : "↓"} {fmt(Math.abs(diff))}
                                        </div>
                                    );
                                })()}
                            </div>
                            <div style={{ fontSize: "16px", fontWeight: "bold", color: "var(--status-paid)", wordBreak: "break-all" }}>{fmt(statsMemo.paid)}</div>
                        </div>
                        <div className="premium-card" style={{ padding: "12px" }}>
                            <div style={{ fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>Pretax</div>
                            <div style={{ fontSize: "16px", fontWeight: "bold", color: "var(--text-primary)", wordBreak: "break-all" }}>{fmt(statsMemo.pretax)}</div>
                        </div>
                        <div className="premium-card" style={{ padding: "12px" }}>
                            <div style={{ fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>Taxes</div>
                            <div style={{ fontSize: "16px", fontWeight: "bold", color: "var(--accent-primary)", wordBreak: "break-all" }}>{fmt(statsMemo.tax)}</div>
                        </div>
                        <div className="premium-card" style={{ padding: "12px" }}>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>Pending</div>
                            <div style={{ fontSize: "16px", fontWeight: "bold", color: "var(--status-pending)", wordBreak: "break-all" }}>{fmt(statsMemo.pending)}</div>
                        </div>
                        <div className="premium-card" style={{ padding: "12px" }}>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>Overdue</div>
                            <div style={{ fontSize: "16px", fontWeight: "bold", color: "var(--status-overdue)", wordBreak: "break-all" }}>{fmt(statsMemo.overdueAmt)}</div>
                        </div>
                        <div className="premium-card" style={{ padding: "12px" }}>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>Drafts</div>
                            <div style={{ fontSize: "16px", fontWeight: "bold", color: "var(--status-draft)", wordBreak: "break-all" }}>{fmt(statsMemo.draftTotal)}</div>
                        </div>
                    </div>


                    <div className="premium-card" style={{ margin: "16px 0", background: "var(--border-accent)", border: "1px solid var(--border-accent)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                            <span style={{ fontSize: "12px", color: "var(--text-secondary)", textTransform: "uppercase" }}>Total Collected</span>
                            <span style={{ fontSize: "12px", color: "var(--status-paid)", fontWeight: "bold" }}>
                                {(() => {
                                    if (statsMemo.total <= 0) return "0";
                                    const pct = (statsMemo.paid / statsMemo.total) * 100;
                                    if (statsMemo.paid >= statsMemo.total) return "100";
                                    if (pct > 0 && pct < 0.1) return "< 0.1";
                                    return Math.min(99.9, pct).toFixed(1).replace(/\.0$/, '');
                                })()}%
                            </span>
                        </div>
                        <div style={{ fontSize: "28px", fontWeight: "bold", wordBreak: "break-all" }}>{fmt(statsMemo.paid)} <span style={{ fontSize: "14px", color: "var(--text-muted)", fontWeight: "normal" }}>/ {fmt(statsMemo.total)}</span></div>
                        <div style={{ height: "6px", background: "var(--border-primary)", borderRadius: "3px", marginTop: "12px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${statsMemo.total > 0 ? Math.max(statsMemo.paid > 0 ? 0.5 : 0, (statsMemo.paid / statsMemo.total) * 100) : 0}%`, background: "var(--status-paid)" }} />
                        </div>
                    </div>
                </>
            )}

            <div style={{ marginTop: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                    <h3 style={{ margin: 0, fontSize: "15px" }}>{search ? "Search Results" : "Recent Invoices"}</h3>
                    {!search && <button onClick={() => setTab("bills")} style={{ background: "none", border: "none", color: "var(--accent-primary)", fontSize: "12px", cursor: "pointer" }}>View All →</button>}
                </div>
                {filteredInvoices
                    .sort((a, b) => {
                        if (search) return new Date(b.date) - new Date(a.date);
                        if (a.status === "overdue" && b.status !== "overdue") return -1;
                        if (a.status !== "overdue" && b.status === "overdue") return 1;
                        return 0;
                    })
                    .slice(0, search ? 20 : 6)
                    .map(inv => (
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
                {filteredInvoices.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                        {search ? `No results for "${search}"` : "Start by creating your first invoice!"}
                    </div>
                )}
            </div>
        </div>
    );
};
