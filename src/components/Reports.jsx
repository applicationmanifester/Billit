import React from "react";

export const Reports = ({ invoices, clients, fmt, totalWithTax, taxRates }) => {
    // Top Clients by Lifetime Value
    const clientLTV = clients.map(client => {
        const clientInvoices = invoices.filter(inv => inv.clientId === client.id);
        const ltv = clientInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        return { ...client, ltv };
    }).sort((a, b) => b.ltv - a.ltv).slice(0, 5);

    // Monthly Trends (Simple Simulation for demo)
    const monthlyGroups = invoices.reduce((acc, inv) => {
        const month = inv.date.substring(0, 7); // YYYY-MM
        acc[month] = (acc[month] || 0) + (inv.totalAmount || 0);
        return acc;
    }, {});

    const sortedMonths = Object.keys(monthlyGroups).sort().slice(-6);

    // Tax Breakdown
    const taxSummary = invoices.reduce((acc, inv) => {
        if (!inv.items) return acc;
        inv.items.forEach(item => {
            const itemTaxIds = Array.isArray(item.tax) ? item.tax : (item.taxId ? [item.taxId] : []);
            itemTaxIds.forEach(tId => {
                const tax = taxRates.find(t => t.id === tId);
                if (tax && item.price && item.qty) {
                    const taxAmt = (item.price * item.qty * tax.rate) / 100;
                    acc[tax.label] = (acc[tax.label] || 0) + taxAmt;
                }
            });
        });
        return acc;
    }, {});

    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalTaxes = Object.values(taxSummary).reduce((sum, val) => sum + val, 0);
    const totalPretax = totalRevenue - totalTaxes;

    // Revenue Breakdown
    const collected = invoices.filter(inv => inv.status === "paid").reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const awaiting = invoices.filter(inv => inv.status === "sent" || inv.status === "draft").reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const overdue = invoices.filter(inv => inv.status === "overdue").reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    // Invoice Stats
    const totalInvoices = invoices.length;
    const avgInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;
    const paidInvoices = invoices.filter(inv => inv.status === "paid").length;
    const collectionRate = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;

    return (
        <div style={{ padding: "16px" }} className="animate-slide-up">
            <h2 style={{ fontSize: "18px", marginBottom: "20px", fontWeight: "900" }}>Financial Reports</h2>

            {/* Quick Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div className="premium-card" style={{ padding: "16px", borderLeft: "4px solid var(--accent-primary)" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)", fontWeight: "bold", marginBottom: "4px" }}>TOTAL PRE-TAX</div>
                    <div style={{ fontSize: "18px", fontWeight: "900" }}>{fmt(totalPretax)}</div>
                </div>
                <div className="premium-card" style={{ padding: "16px", borderLeft: "4px solid var(--status-paid)" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)", fontWeight: "bold", marginBottom: "4px" }}>TAXES COLLECTED</div>
                    <div style={{ fontSize: "18px", fontWeight: "900" }}>{fmt(totalTaxes)}</div>
                </div>
            </div>

            {/* Main Revenue Card */}
            <div className="premium-card" style={{ padding: "20px", marginBottom: "20px", background: "var(--accent-gradient)", color: "#000" }}>
                <div style={{ fontSize: "11px", fontWeight: "900", opacity: 0.7, marginBottom: "4px" }}>TOTAL REVENUE (ALL TIME)</div>
                <div style={{ fontSize: "28px", fontWeight: "900" }}>{fmt(totalRevenue)}</div>
            </div>

            {/* Revenue Breakdown */}
            <div className="premium-card" style={{ padding: "20px", marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px", fontWeight: "bold" }}>REVENUE BREAKDOWN</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    <div style={{ textAlign: "center", padding: "12px", background: "var(--bg-primary)", borderRadius: "12px" }}>
                        <div style={{ fontSize: "10px", color: "var(--status-paid)", fontWeight: "bold", marginBottom: "4px" }}>COLLECTED</div>
                        <div style={{ fontWeight: "900", fontSize: "14px" }}>{fmt(collected)}</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "12px", background: "var(--bg-primary)", borderRadius: "12px" }}>
                        <div style={{ fontSize: "10px", color: "var(--status-sent)", fontWeight: "bold", marginBottom: "4px" }}>AWAITING</div>
                        <div style={{ fontWeight: "900", fontSize: "14px" }}>{fmt(awaiting)}</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "12px", background: "var(--bg-primary)", borderRadius: "12px" }}>
                        <div style={{ fontSize: "10px", color: "var(--status-overdue)", fontWeight: "bold", marginBottom: "4px" }}>OVERDUE</div>
                        <div style={{ fontWeight: "900", fontSize: "14px" }}>{fmt(overdue)}</div>
                    </div>
                </div>
            </div>

            {/* Invoice Stats */}
            <div className="premium-card" style={{ padding: "20px", marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px", fontWeight: "bold" }}>INVOICE STATS</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                    <div style={{ borderRight: "1px solid var(--border-primary)" }}>
                        <div style={{ fontSize: "10px", color: "var(--text-secondary)", fontWeight: "bold" }}>TOTAL INVOICES</div>
                        <div style={{ fontSize: "20px", fontWeight: "900" }}>{totalInvoices}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: "10px", color: "var(--text-secondary)", fontWeight: "bold" }}>AVG. VALUE</div>
                        <div style={{ fontSize: "20px", fontWeight: "900" }}>{fmt(avgInvoiceValue)}</div>
                    </div>
                </div>
                <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border-primary)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "bold" }}>Collection Rate</span>
                        <span style={{ fontSize: "12px", fontWeight: "900" }}>{collectionRate.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: "8px", background: "var(--bg-primary)", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${collectionRate}%`, background: "var(--status-paid)", borderRadius: "4px" }}></div>
                    </div>
                </div>
            </div>

            <div className="premium-card" style={{ padding: "20px", marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px", fontWeight: "bold" }}>TAX BREAKDOWN</div>
                {Object.keys(taxSummary).length === 0 ? (
                    <div style={{ fontSize: "14px", opacity: 0.6 }}>No tax data available.</div>
                ) : (
                    <div style={{ display: "grid", gap: "10px" }}>
                        {Object.entries(taxSummary).map(([label, amt]) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--bg-primary)", borderRadius: "12px" }}>
                                <span style={{ fontWeight: "bold" }}>{label}</span>
                                <span style={{ color: "var(--accent-primary)", fontWeight: "bold" }}>{fmt(amt)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="premium-card" style={{ padding: "20px", marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px", fontWeight: "bold" }}>TOP CLIENTS (LTV)</div>
                <div style={{ display: "grid", gap: "10px" }}>
                    {clientLTV.map(client => (
                        <div key={client.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-primary)" }}>
                            <div style={{ fontSize: "14px" }}>{client.name}</div>
                            <div style={{ fontWeight: "bold", fontSize: "14px" }}>{fmt(client.ltv)}</div>
                        </div>
                    ))}
                    {clientLTV.length === 0 && <div style={{ fontSize: "14px", opacity: 0.6 }}>No client data available.</div>}
                </div>
            </div>

            <div className="premium-card" style={{ padding: "20px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px", fontWeight: "bold" }}>REVENUE TREND (LAST 6 MONTHS)</div>
                {sortedMonths.length === 0 ? (
                    <div style={{ fontSize: "14px", opacity: 0.6 }}>No historical data yet.</div>
                ) : (
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", height: "150px", paddingTop: "20px" }}>
                        {sortedMonths.map(month => {
                            const val = monthlyGroups[month];
                            const max = Math.max(...Object.values(monthlyGroups));
                            const height = max ? (val / max) * 100 : 0;
                            return (
                                <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                                    <div style={{ fontSize: "8px", fontWeight: "bold" }}>{fmt(val)}</div>
                                    <div style={{ width: "100%", background: "var(--accent-gradient)", height: `${height}%`, borderRadius: "4px 4px 0 0", minHeight: "2px" }}></div>
                                    <div style={{ fontSize: "8px", color: "var(--text-secondary)" }}>{month}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div >
    );
};
