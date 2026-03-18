import React from "react";
import { SearchBar } from "./SearchBar";

export const Layout = ({ children, seller, setTab, tab, isDark, user, authLoading, loginWithPopup, logout, setShowModal, setShowSellerModal, handleNewInvoice, search, setSearch }) => {
    const brandLogoSrc = '/billit_logo.png';

    return (
        <div style={{
            minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif",
            width: "100%", 
            paddingBottom: "calc(100px + var(--safe-area-bottom))", 
            paddingTop: "calc(80px + var(--safe-area-top))",
            paddingLeft: "var(--safe-area-left)",
            paddingRight: "var(--safe-area-right)",
            position: "relative", overflowX: "hidden"
        }}>
            {/* Header with Glassmorphism */}
            <div 
                className="backdrop-blur"
                style={{
                    position: "fixed", top: 0, left: 0,
                    width: "100%", zIndex: 100,
                    background: "var(--bg-header)",
                    padding: "calc(8px + var(--safe-area-top)) 16px 10px", 
                    borderBottom: `1px solid var(--border-primary)`,
                    display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center",
                    boxSizing: "border-box", gap: "16px"
                }}
            >
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div
                        onClick={() => setTab("home")}
                        style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", height: "40px" }}
                    >
                        <img src={brandLogoSrc} onError={(e) => { e.currentTarget.src = "/logo.png"; }} style={{ height: "100%", borderRadius: "8px", objectFit: "contain" }} alt="Billit" />
                    </div>
                </div>

                {/* Business Profile Section (Centered & Clickable) */}
                <div
                    onClick={() => setShowSellerModal(true)}
                    className="clickable-header-profile"
                    style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "4px 12px", background: "var(--bg-secondary)",
                        borderRadius: "16px", border: "1px solid var(--border-primary)",
                        maxWidth: "320px", minWidth: "150px", flexShrink: 0, overflow: "hidden", cursor: "pointer",
                        transition: "all 0.2s ease"
                    }}
                >
                    {seller.logo ? (
                        <img src={seller.logo} style={{ width: "32px", height: "32px", borderRadius: "8px", objectFit: "cover" }} alt="" />
                    ) : (
                        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--bg-input)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>🏢</div>
                    )}
                    <div style={{ fontSize: "14px", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {seller.name}
                    </div>
                </div>

                {/* Header Actions */}
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button onClick={() => setTab("settings")} className="secondary-btn" style={{ padding: "8px", borderRadius: "10px" }}>⚙️</button>
                    <button className="primary-btn" style={{ fontSize: "11px", padding: "10px 12px", whiteSpace: "nowrap" }} onClick={handleNewInvoice}>+ New Invoice</button>
                </div>
            </div>

            <main style={{ padding: tab === "home" || tab === "stats" ? "20px" : "0" }}>
                <div style={{ maxWidth: "600px", margin: "0 auto 20px" }}>
                    <SearchBar search={search} setSearch={setSearch} placeholder={`Search ${tab === 'home' ? 'everything' : tab}...`} />
                </div>
                {children}
            </main>

            {/* Navigation Bar */}
            <div style={{
                position: "fixed", bottom: "calc(12px + var(--safe-area-bottom))", left: "50%", transform: "translateX(-50%)",
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
