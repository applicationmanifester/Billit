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
    printMultipleInvoicesThermal,
    shareMultipleInvoices,
    showBatchPrint,
    showToast,
    getClient,
    fmt,
    totalWithTax,
    taxRates,
    setSelectedInvoice,
    setShowModal,
    invoiceSort,
    setInvoiceSort,
    batchUpdateStatus,
    handleNewInvoice
}) => {
    const filtered = (invoices || []).filter(i =>
        (filterStatus === "all" || i.status === filterStatus) &&
        (i.id.toLowerCase().includes(search.toLowerCase()) ||
            (getClient(i.clientId)?.name || "").toLowerCase().includes(search.toLowerCase()))
    ).sort((a, b) => {
        if (invoiceSort === "dateDesc") return new Date(b.date) - new Date(a.date);
        if (invoiceSort === "dateAsc") return new Date(a.date) - new Date(b.date);
        if (invoiceSort === "amountDesc") return totalWithTax(b.items, taxRates) - totalWithTax(a.items, taxRates);
        if (invoiceSort === "amountAsc") return totalWithTax(a.items, taxRates) - totalWithTax(b.items, taxRates);
        if (invoiceSort === "client") {
            const nameA = (getClient(a.clientId)?.name || "").toLowerCase();
            const nameB = (getClient(b.clientId)?.name || "").toLowerCase();
            return nameA.localeCompare(nameB);
        }
        return 0;
    });

    const allFilteredSelected = filtered.length > 0 && filtered.every(i => selectedInvoices.includes(i.id));

    const toggleSelectAll = () => {
        if (allFilteredSelected) {
            const filteredIds = filtered.map(i => i.id);
            setSelectedInvoices(prev => prev.filter(id => !filteredIds.includes(id)));
        } else {
            const filteredIds = filtered.map(i => i.id);
            setSelectedInvoices(prev => Array.from(new Set([...prev, ...filteredIds])));
        }
    };

    return (
        <div className="animate-slide-up">
            <div style={{ padding: "16px", background: "var(--bg-primary)", borderBottom: `1px solid var(--border-primary)`, boxSizing: "border-box", marginBottom: "16px" }}>
                <div style={{ display: "flex", gap: "10px", marginBottom: "16px", alignItems: "center" }}>
                    <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", flex: 1 }}>Invoices</h2>
                    <div style={{ display: "flex", gap: "8px" }}>
                        {isSelectionMode ? (
                            <button onClick={toggleSelectAll} className="secondary-btn" style={{ height: "40px", fontSize: "12px", borderRadius: "10px", padding: "0 14px", color: "var(--accent-primary)", border: "1px solid var(--border-primary)" }}>
                                {allFilteredSelected ? "Deselect All" : "Select All"}
                            </button>
                        ) : (
                            <button onClick={handleNewInvoice} className="primary-btn" style={{ height: "40px", padding: "0 14px", borderRadius: "10px", fontSize: "12px" }}>+ New</button>
                        )}
                        <button onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedInvoices([]); }} className="secondary-btn" style={{ height: "40px", fontSize: "12px", borderRadius: "10px", color: "var(--accent-primary)" }}>{isSelectionMode ? "Cancel" : "Select"}</button>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", overflowX: "auto", paddingBottom: "10px", scrollbarWidth: "none" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                        {["all", "draft", "sent", "paid", "overdue"].map(s => {
                            const isActive = filterStatus === s;
                            const activeColor = s === "all" ? "var(--accent-primary)" : `var(--status-${s})`;
                            return (
                                <button key={s} onClick={() => setFilterStatus(s)} style={{
                                    height: "32px", padding: "0 14px", borderRadius: "50px", whiteSpace: "nowrap",
                                    border: `1px solid ${isActive ? activeColor : "var(--border-primary)"}`,
                                    background: isActive ? activeColor : "var(--bg-card)",
                                    color: isActive ? "#000" : "var(--text-secondary)",
                                    fontSize: "10px", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s"
                                }}>{s.toUpperCase()}</button>
                            );
                        })}
                    </div>
                    <div style={{ height: "20px", width: "1px", background: "var(--border-primary)", margin: "0 4px" }} />
                    <select
                      value={invoiceSort}
                      onChange={(e) => setInvoiceSort(e.target.value)}
                      style={{
                        height: "32px", padding: "0 10px", borderRadius: "16px",
                        background: "var(--bg-card)", color: "var(--text-primary)",
                        border: "1px solid var(--border-primary)", fontSize: "10px", fontWeight: "bold",
                        outline: "none", cursor: "pointer"
                      }}
                    >
                      <option value="dateDesc">Date (Newest)</option>
                      <option value="dateAsc">Date (Oldest)</option>
                      <option value="amountDesc">Amount (High)</option>
                      <option value="amountAsc">Amount (Low)</option>
                      <option value="client">Client (A-Z)</option>
                    </select>
                </div>

                {isSelectionMode && selectedInvoices.length > 0 && (
                    <div style={{
                        padding: "12px 0 0",
                        display: "grid",
                        gridTemplateColumns: "repeat(5, 1fr)",
                        gap: "6px",
                        borderTop: `1px solid var(--border-primary)`,
                        marginTop: "12px"
                    }}>
                        <button onClick={deleteInvoices} className="secondary-btn" style={{ padding: "10px 16px", fontSize: "10px", color: "#ef4444" }}>🗑 Delete</button>
                        <button onClick={() => {
                            const selectedInvs = invoices.filter(i => selectedInvoices.includes(i.id));
                            downloadMultipleInvoices(selectedInvs);
                        }} className="secondary-btn" style={{ padding: "10px 16px", fontSize: "10px", color: "var(--accent-primary)" }}>⬇ Download</button>
                        <button onClick={() => {
                            const selectedInvs = invoices.filter(i => selectedInvoices.includes(i.id));
                            shareMultipleInvoices(selectedInvs);
                        }} className="secondary-btn" style={{ padding: "10px 16px", fontSize: "10px", color: "var(--accent-primary)" }}>📨 Share</button>
                        <button onClick={() => {
                            const selectedInvs = invoices.filter(i => selectedInvoices.includes(i.id));
                            printMultipleInvoices(selectedInvs);
                        }} className="secondary-btn" style={{ padding: "10px 16px", fontSize: "10px", color: "var(--accent-primary)" }}>🖨️ Print</button>
                        <button onClick={() => {
                            const selectedInvs = invoices.filter(i => selectedInvoices.includes(i.id));
                            printMultipleInvoicesThermal(selectedInvs);
                        }} className="secondary-btn" style={{ padding: "10px 16px", fontSize: "10px", color: "var(--accent-primary)" }}>🧾 Thermal</button>
                    </div>
                )}
            </div>
            <div style={{ padding: "0 16px" }}>
                {filtered.map(inv => (
                    <div key={inv.id} className="premium-card" style={{
                        marginBottom: "12px", border: `1px solid ${selectedInvoices.includes(inv.id) ? "var(--accent-primary)" : "var(--border-primary)"}`,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", padding: "16px"
                    }} onClick={() => isSelectionMode ? toggleSelection(inv.id) : (setSelectedInvoice(inv), setShowModal("view"))}>
                        {isSelectionMode && <div style={{ width: "32px", height: "32px", minWidth: "32px", borderRadius: "10px", border: `2px solid ${selectedInvoices.includes(inv.id) ? "var(--accent-primary)" : "var(--border-primary)"}`, background: selectedInvoices.includes(inv.id) ? "var(--accent-primary)" : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{selectedInvoices.includes(inv.id) && "✓"}</div>}
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
                        {!search && <button onClick={handleNewInvoice} className="primary-btn" style={{ padding: "12px 24px" }}>Create Invoice</button>}
                    </div>
                )}
            </div>
        </div>
    );
};
