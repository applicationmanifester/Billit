import React from "react";

export const InvoiceManager = ({
    invoices,
    filterStatus,
    setFilterStatus,
    search,
    setSearch,
    isSelectionMode,
    setIsSelectionMode,
    selectedInvoices,
    setSelectedInvoices,
    toggleSelection,
    deleteInvoices,
    downloadMultipleInvoices,
    printMultipleInvoices,
    shareMultipleInvoices,
    showBatchPrint,
    showToast,
    getClient,
    fmt,
    totalWithTax,
    taxRates,
    setSelectedInvoice,
    setShowModal,
    batchUpdateStatus,
    handleNewInvoice
}) => {
    const filtered = (invoices || []).filter(i =>
        (filterStatus === "all" || i.status === filterStatus) &&
        (i.id.toLowerCase().includes(search.toLowerCase()) ||
            (getClient(i.clientId)?.name || "").toLowerCase().includes(search.toLowerCase()))
    ).slice().reverse();

    return (
        <div style={{ paddingTop: isSelectionMode && selectedInvoices.length > 0 ? "255px" : "195px", transition: "padding 0.2s" }} className="animate-slide-up">
            <div style={{ padding: "16px", position: "fixed", top: "72px", left: 0, width: "100%", background: "var(--bg-primary)", zIndex: 190, borderBottom: `1px solid var(--border-primary)`, boxSizing: "border-box" }}>
                <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                    <input className="input-field" style={{ flex: 1 }} placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    <button onClick={handleNewInvoice} className="primary-btn" style={{ height: "46px", padding: "0 16px", borderRadius: "12px", fontSize: "12px" }}>+ New</button>
                    <button onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedInvoices([]); }} className="secondary-btn" style={{ height: "46px", color: "var(--accent-primary)" }}>{isSelectionMode ? "Cancel" : "Select"}</button>
                </div>
                <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px", justifyContent: "center" }}>
                    {["all", "draft", "sent", "paid", "overdue"].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)} style={{
                            height: "32px", padding: "0 16px", borderRadius: "16px", whiteSpace: "nowrap",
                            border: `1px solid ${filterStatus === s ? "var(--accent-primary)" : "var(--border-primary)"}`,
                            background: filterStatus === s ? "var(--accent-primary)" : "var(--bg-card)",
                            color: filterStatus === s ? "#000" : "var(--text-secondary)",
                            fontSize: "11px", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s"
                        }}>{s.toUpperCase()}</button>
                    ))}
                </div>

                {isSelectionMode && selectedInvoices.length > 0 && (
                    <div style={{
                        padding: "12px 0 0",
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: "8px",
                        borderTop: `1px solid var(--border-primary)`,
                        marginTop: "12px"
                    }}>
                        <button onClick={deleteInvoices} style={{ padding: "10px 4px", borderRadius: "10px", background: "#ef4444", color: "#fff", border: "none", fontWeight: "bold", fontSize: "11px", cursor: "pointer" }}>🗑 Delete</button>
                        <button onClick={() => {
                            const selectedInvs = invoices.filter(i => selectedInvoices.includes(i.id));
                            downloadMultipleInvoices(selectedInvs);
                        }} className="primary-btn" style={{ padding: "10px 4px", fontSize: "11px" }}>⬇ Download</button>
                        <button onClick={() => {
                            const selectedInvs = invoices.filter(i => selectedInvoices.includes(i.id));
                            printMultipleInvoices(selectedInvs);
                        }} className="primary-btn" style={{ padding: "10px 4px", fontSize: "11px" }}>🖨️ Print</button>
                        <button onClick={() => {
                            const selectedInvs = invoices.filter(i => selectedInvoices.includes(i.id));
                            shareMultipleInvoices(selectedInvs);
                        }} className="secondary-btn" style={{ padding: "10px 4px", fontSize: "11px", color: "var(--accent-primary)" }}>📨 Share</button>
                    </div>
                )}
            </div>
            <div style={{ padding: "0 16px" }}>
                {filtered.map(inv => (
                    <div key={inv.id} className="premium-card" style={{
                        marginBottom: "12px", border: `1px solid ${selectedInvoices.includes(inv.id) ? "var(--accent-primary)" : "var(--border-primary)"}`,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", padding: "16px"
                    }} onClick={() => isSelectionMode ? toggleSelection(inv.id) : (setSelectedInvoice(inv), setShowModal("view"))}>
                        {isSelectionMode && <div style={{ width: "20px", height: "20px", borderRadius: "6px", border: `2px solid ${selectedInvoices.includes(inv.id) ? "var(--accent-primary)" : "var(--border-primary)"}`, background: selectedInvoices.includes(inv.id) ? "var(--accent-primary)" : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>{selectedInvoices.includes(inv.id) && "✓"}</div>}
                        <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: "11px", color: "var(--accent-primary)", fontWeight: "bold" }}>{inv.id}</div>
                                <div style={{ fontSize: "15px", fontWeight: "600" }}>{getClient(inv.clientId)?.name}</div>
                                <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{inv.date}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "4px" }}>{fmt(totalWithTax(inv.items, taxRates))}</div>
                                <span className="badge" style={{ background: `var(--status-${inv.status})` }}>{inv.status}</span>
                            </div>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="empty-state animate-slide-up">
                        <div className="empty-state-icon">📄</div>
                        <div className="empty-state-title">No invoices found</div>
                        <p className="empty-state-text">
                            {search ? `Searching for "${search}" didn't return any results.` : "Create your first invoice to get started with professional billing."}
                        </p>
                        {!search && <button onClick={handleNewInvoice} className="primary-btn">Create Invoice</button>}
                    </div>
                )}
            </div>
        </div>
    );
};
