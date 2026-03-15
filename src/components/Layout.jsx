import React from "react";

export const Layout = ({ children, seller, setTab, tab, isDark, user, authLoading, loginWithPopup, logout, setShowModal, handleNewInvoice }) => {
    return (
        <div style={{
            minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif",
            width: "100%", paddingBottom: "100px", paddingTop: "80px",
            position: "relative", overflowX: "hidden"
        }}>
            {/* Header */}
            <div style={{
                position: "fixed", top: 0, left: 0,
                width: "100%", zIndex: 100,
                background: "var(--bg-header)",
                padding: "12px 16px", borderBottom: `1px solid var(--border-primary)`,
                display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center",
                boxSizing: "border-box", gap: "10px"
            }}>
                <div
                    onClick={() => setTab("home")}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", cursor: "pointer", minWidth: "50px" }}
                >
                    <div style={{ background: "var(--accent-gradient)", width: "32px", height: "32px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", color: "#000" }}>B</div>
                    <h1 style={{ fontSize: "12px", fontWeight: "900", letterSpacing: "-0.2px", margin: 0, opacity: 0.9 }}>Billit</h1>
                </div>

                <div style={{ textAlign: "center", fontSize: "16px", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 4px" }}>
                    {seller.name}
                </div>

                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button onClick={() => setTab("settings")} className="secondary-btn" style={{ padding: "8px", borderRadius: "10px" }}>⚙️</button>
                    <button className="primary-btn" style={{ fontSize: "11px", padding: "10px 12px", whiteSpace: "nowrap" }} onClick={handleNewInvoice}>+ New Invoice</button>
                </div>
            </div>

            <main style={{ padding: tab === "home" || tab === "stats" ? "20px" : "0" }}>
                {children}
            </main>

            {/* Navigation Bar */}
            <div style={{
                position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)",
                width: "calc(100% - 40px)", maxWidth: "400px", zIndex: 100,
                background: "var(--bg-secondary)", borderRadius: "24px",
                padding: "8px", display: "flex", justifyContent: "space-between",
                boxShadow: "var(--shadow-md)", border: "1px solid var(--border-primary)"
            }}>
                {[
                    { id: "home", icon: "🏠", label: "Home" },
                    { id: "bills", icon: "📄", label: "Invoices" },
                    { id: "reports", icon: "📊", label: "Reports" },
                    { id: "clients", icon: "👥", label: "Clients" },
                    { id: "items", icon: "📦", label: "Items" }
                ].map(n => (
                    <button key={n.id} onClick={() => setTab(n.id)} style={{
                        flex: 1, background: tab === n.id ? "var(--accent-primary)" : "none",
                        border: "none", borderRadius: "18px", padding: "10px", cursor: "pointer",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                        transition: "all 0.2s"
                    }}>
                        <span style={{ fontSize: "18px" }}>{n.icon}</span>
                        <span style={{ fontSize: "10px", fontWeight: "bold", color: tab === n.id ? "#000" : "var(--text-secondary)", opacity: 0.9 }}>{n.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
