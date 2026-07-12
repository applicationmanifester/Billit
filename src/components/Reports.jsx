import React from "react";

export const Reports = ({ invoices, clients, fmt, totalWithTax, taxRates, statsMemo, reportRange, setReportRange }) => {
    const invs = statsMemo.invs || invoices;

    // Top Clients by Lifetime Value
    const clientLTV = statsMemo.sortedClients.slice(0, 5);

    // Monthly Trends
    const monthlyGroups = invs.reduce((acc, inv) => {
        const month = inv.date.substring(0, 7); // YYYY-MM
        const amt = inv.totalAmount || totalWithTax(inv.items, taxRates);
        acc[month] = (acc[month] || 0) + amt;
        return acc;
    }, {});

    const sortedMonths = Object.keys(monthlyGroups).sort().slice(-6);
    const maxMonthlyRevenue = Math.max(...Object.values(monthlyGroups), 0);

    const totalRevenue = statsMemo.total;
    const totalTaxes = statsMemo.tax;
    const totalPretax = statsMemo.pretax;

    // Revenue Breakdown
    const collected = statsMemo.paid;
    const awaiting = statsMemo.pending;
    const overdue = statsMemo.overdue;

    // Invoice Stats
    const totalInvoices = statsMemo.counts.all;
    const avgInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;
    const paidInvoices = statsMemo.counts.paid;
    const collectionRate = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;

    const rangeLabels = {
        month: "This Month",
        year: "This Year",
        "30d": "Last 30 Days",
        "90d": "Last 90 Days",
        all: "All Time"
    };

    return (
        <div style={{ padding: "16px" }} className="animate-slide-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "18px", margin: 0, fontWeight: "900" }}>Financial Reports</h2>
                <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--accent-primary)", background: "var(--bg-card)", padding: "4px 10px", borderRadius: "8px", border: "1px solid var(--border-primary)" }}>
                    {rangeLabels[reportRange]}
                </div>
            </div>

            {/* Range Selector */}
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "16px", scrollbarWidth: "none" }}>
                {Object.entries(rangeLabels).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setReportRange(key)}
                        style={{
                            padding: "8px 16px", borderRadius: "20px", fontSize: "11px", fontWeight: "bold",
                            whiteSpace: "nowrap", border: "1px solid var(--border-primary)",
                            background: reportRange === key ? "var(--accent-primary)" : "var(--bg-card)",
                            color: reportRange === key ? "#000" : "var(--text-secondary)",
                            cursor: "pointer", transition: "all 0.2s"
                        }}
                    >
                        {label.toUpperCase()}
                    </button>
                ))}
            </div>

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
                <div style={{ fontSize: "11px", fontWeight: "900", opacity: 0.7, marginBottom: "4px" }}>TOTAL REVENUE ({rangeLabels[reportRange].toUpperCase()})</div>
                <div style={{ fontSize: "28px", fontWeight: "900" }}>{fmt(totalRevenue)}</div>
            </div>

            {/* Revenue Breakdown */}
            <div className="premium-card" style={{ padding: "20px", marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px", fontWeight: "bold" }}>REVENUE COLLECTION EFFICIENCY</div>
                
                {(() => {
                    const totalBreakdown = collected + awaiting + overdue;
                    const pctPaid = totalBreakdown > 0 ? (collected / totalBreakdown) * 100 : 0;
                    const pctAwaiting = totalBreakdown > 0 ? (awaiting / totalBreakdown) * 100 : 0;
                    const pctOverdue = totalBreakdown > 0 ? (overdue / totalBreakdown) * 100 : 0;

                    return (
                        <>
                            <div style={{ height: "12px", background: "var(--bg-primary)", borderRadius: "6px", display: "flex", overflow: "hidden", marginBottom: "16px", border: "1px solid var(--border-primary)" }}>
                                {pctPaid > 0 && <div style={{ width: `${pctPaid}%`, background: "var(--status-paid)", transition: "width 0.3s" }} title={`Collected: ${pctPaid.toFixed(1)}%`} />}
                                {pctAwaiting > 0 && <div style={{ width: `${pctAwaiting}%`, background: "var(--status-sent)", transition: "width 0.3s" }} title={`Awaiting: ${pctAwaiting.toFixed(1)}%`} />}
                                {pctOverdue > 0 && <div style={{ width: `${pctOverdue}%`, background: "var(--status-overdue)", transition: "width 0.3s" }} title={`Overdue: ${pctOverdue.toFixed(1)}%`} />}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                                <div style={{ textAlign: "center", padding: "12px", background: "var(--bg-primary)", borderRadius: "12px", border: "1px solid var(--border-primary)" }}>
                                    <div style={{ fontSize: "10px", color: "var(--status-paid)", fontWeight: "bold", marginBottom: "4px" }}>COLLECTED ({pctPaid.toFixed(0)}%)</div>
                                    <div style={{ fontWeight: "900", fontSize: "14px" }}>{fmt(collected)}</div>
                                </div>
                                <div style={{ textAlign: "center", padding: "12px", background: "var(--bg-primary)", borderRadius: "12px", border: "1px solid var(--border-primary)" }}>
                                    <div style={{ fontSize: "10px", color: "var(--status-sent)", fontWeight: "bold", marginBottom: "4px" }}>AWAITING ({pctAwaiting.toFixed(0)}%)</div>
                                    <div style={{ fontWeight: "900", fontSize: "14px" }}>{fmt(awaiting)}</div>
                                </div>
                                <div style={{ textAlign: "center", padding: "12px", background: "var(--bg-primary)", borderRadius: "12px", border: "1px solid var(--border-primary)" }}>
                                    <div style={{ fontSize: "10px", color: "var(--status-overdue)", fontWeight: "bold", marginBottom: "4px" }}>OVERDUE ({pctOverdue.toFixed(0)}%)</div>
                                    <div style={{ fontWeight: "900", fontSize: "14px" }}>{fmt(overdue)}</div>
                                </div>
                            </div>
                        </>
                    );
                })()}
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
                        <span style={{ fontSize: "12px", fontWeight: "900" }}>{(Number(collectionRate) || 0).toFixed(1)}%</span>
                    </div>
                    <div style={{ height: "8px", background: "var(--bg-primary)", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${collectionRate}%`, background: "var(--status-paid)", borderRadius: "4px" }}></div>
                    </div>
                </div>
            </div>

            <div className="premium-card" style={{ padding: "20px", marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px", fontWeight: "bold" }}>TAX BREAKDOWN</div>
                {!statsMemo.taxBreakdown || Object.keys(statsMemo.taxBreakdown).length === 0 ? (
                    <div style={{ fontSize: "14px", opacity: 0.6 }}>No tax data available for this period.</div>
                ) : (
                    <div style={{ display: "grid", gap: "10px" }}>
                        {Object.entries(statsMemo.taxBreakdown).map(([label, amt]) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--bg-primary)", borderRadius: "12px" }}>
                                <span style={{ fontWeight: "bold" }}>{label}</span>
                                <span style={{ color: "var(--accent-primary)", fontWeight: "bold" }}>{fmt(amt)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="premium-card" style={{ padding: "20px", marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px", fontWeight: "bold" }}>TOP CLIENTS CONTRIBUTION (LTV)</div>
                <div style={{ display: "grid", gap: "14px" }}>
                    {clientLTV.map(client => {
                        const clientShare = totalRevenue > 0 ? (client.ltv / totalRevenue) * 100 : 0;
                        return (
                            <div key={client.id} style={{ paddingBottom: "10px", borderBottom: "1px solid var(--border-primary)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <div style={{ fontSize: "14px", fontWeight: "bold" }}>{client.name}</div>
                                        <span style={{ 
                                            fontSize: "10px", 
                                            background: "rgba(245, 200, 66, 0.1)", 
                                            color: "var(--accent-primary)", 
                                            padding: "2px 8px", 
                                            borderRadius: "10px", 
                                            fontWeight: "bold" 
                                        }}>
                                            {clientShare.toFixed(1)}% share
                                        </span>
                                    </div>
                                    <div style={{ fontWeight: "900", fontSize: "14px" }}>{fmt(client.ltv)}</div>
                                </div>
                                <div style={{ height: "6px", background: "var(--bg-primary)", borderRadius: "3px", overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${clientShare}%`, background: "var(--accent-primary)", borderRadius: "3px", transition: "width 0.3s" }}></div>
                                </div>
                            </div>
                        );
                    })}
                    {clientLTV.length === 0 && <div style={{ fontSize: "14px", opacity: 0.6 }}>No client data available for this period.</div>}
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
                            const max = maxMonthlyRevenue;
                            const height = max ? (val / max) * 100 : 0;
                            return (
                                <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                                    <div style={{ fontSize: "8px", fontWeight: "bold" }}>{fmt(val)}</div>
                                    <div style={{ width: "100%", background: "var(--accent-secondary)", height: `${height}%`, borderRadius: "4px 4px 0 0", minHeight: "2px" }}></div>
                                    <div style={{ fontSize: "8px", color: "var(--text-secondary)" }}>{month}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
