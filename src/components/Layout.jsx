import React from "react";
import { SearchBar } from "./SearchBar";
import { 
    Home, 
    FileText, 
    BarChart3, 
    Users, 
    Package, 
    Settings, 
    Plus, 
    X, 
    Building2 
} from "lucide-react";

export const Layout = ({ children, seller, setTab, tab, isDark, user, authLoading, loginWithPopup, logout, setShowModal, setShowSellerModal, handleNewInvoice, handleNewClient, handleNewProduct, search, setSearch, plan = "free" }) => {
    // Unused props from BillingApp: isNativePlatform, openSellerModal (Layout uses setShowSellerModal directly)
    const brandLogoSrc = '/billit_logo.png';
    const [isFabOpen, setIsFabOpen] = React.useState(false);

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
            {/* Floating Action Button (Mobile Only via CSS) */}
            <div className="fab-container">
                {isFabOpen && (
                    <div className="fab-menu animate-slide-up">
                        <button className="fab-item" onClick={() => { handleNewProduct(); setIsFabOpen(false); }}>
                            <span className="fab-item-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Package size={16} color="var(--accent-primary)" />
                            </span>
                            <span>New Item</span>
                        </button>
                        <button className="fab-item" onClick={() => { handleNewClient(); setIsFabOpen(false); }}>
                            <span className="fab-item-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Users size={16} color="var(--accent-primary)" />
                            </span>
                            <span>New Client</span>
                        </button>
                        <button className="fab-item" onClick={() => { handleNewInvoice(); setIsFabOpen(false); }}>
                            <span className="fab-item-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <FileText size={16} color="var(--accent-primary)" />
                            </span>
                            <span>New Invoice</span>
                        </button>
                    </div>
                )}
                <button className={`fab ${isFabOpen ? 'open' : ''}`} onClick={() => setIsFabOpen(!isFabOpen)} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isFabOpen ? <X size={20} /> : <Plus size={20} />}
                </button>
            </div>

            {/* Header with Glassmorphism */}
            <div 
                className="backdrop-blur"
                style={{
                    position: "fixed", top: 0, left: 0,
                    width: "100%", zIndex: 300,
                    background: "var(--bg-header)",
                    padding: "calc(10px + var(--safe-area-top)) 16px 12px", 
                    borderBottom: `1px solid var(--border-primary)`,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    boxSizing: "border-box", gap: "12px"
                }}
            >
                {/* Brand & Logo (Left) */}
                <div 
                    onClick={() => setTab("home")}
                    style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", minWidth: 0, flexShrink: 1 }}
                >
                    <img src={brandLogoSrc} onError={(e) => { e.currentTarget.src = "/logo.png"; }} style={{ height: "36px", borderRadius: "8px", objectFit: "contain" }} alt="Billit" />
                    <span className="desktop-only" style={{ fontSize: "18px", fontWeight: "900", letterSpacing: "-0.5px" }}>Billit</span>
                </div>

                {/* Header Actions (Right) */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    {/* Business Profile (Clickable Name Only) */}
                    <div
                        onClick={() => setShowSellerModal(true)}
                        className="clickable-header-profile"
                        style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            padding: "6px 8px", background: "var(--bg-input)",
                            borderRadius: "12px", border: "1px solid var(--border-primary)",
                            maxWidth: "140px", cursor: "pointer", transition: "all 0.2s ease"
                        }}
                    >
                        {seller.logo ? (
                            <img src={seller.logo} style={{ width: "24px", height: "24px", borderRadius: "6px", objectFit: "cover" }} alt="" />
                        ) : (
                            <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Building2 size={14} color="var(--text-secondary)" />
                            </div>
                        )}
                        <div style={{ fontSize: "12px", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {seller.name}
                        </div>
                    </div>

                    <button onClick={() => setTab("settings")} className="secondary-btn" style={{ padding: "8px", borderRadius: "10px", minWidth: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Settings size={16} color="var(--text-primary)" />
                    </button>
                    <button className="primary-btn" style={{ padding: "10px 14px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "6px" }} onClick={handleNewInvoice}>
                        <Plus size={16} />
                        <span className="desktop-only" style={{ fontSize: "12px" }}>New Invoice</span>
                    </button>
                </div>
            </div>

            <main style={{ padding: tab === "home" || tab === "stats" ? "20px" : "0" }}>
                <div style={{ maxWidth: "600px", margin: "0 auto 20px" }}>
                    <SearchBar search={search} setSearch={setSearch} placeholder={`Search ${tab === 'home' ? 'everything' : tab}...`} />
                </div>
                {children}
            </main>

            {/* Navigation Bar */}
            <div 
                className="nav-bar-container"
                style={{
                    position: "fixed", bottom: "calc(16px + var(--safe-area-bottom))", left: "50%", transform: "translateX(-50%)",
                    width: "calc(100% - 32px)", maxWidth: "440px", zIndex: 100,
                    background: "var(--bg-secondary)", borderRadius: "24px",
                    padding: "8px 12px", display: "flex", justifyContent: "space-between",
                    boxShadow: "var(--shadow-md)", border: "1px solid var(--border-primary)"
                }}
            >
                {[
                    { id: "home", icon: (color) => <Home size={18} color={color} strokeWidth={2.2} />, label: "Home" },
                    { id: "bills", icon: (color) => <FileText size={18} color={color} strokeWidth={2.2} />, label: "Invoices" },
                    { id: "reports", icon: (color) => <BarChart3 size={18} color={color} strokeWidth={2.2} />, label: "Reports" },
                    { id: "clients", icon: (color) => <Users size={18} color={color} strokeWidth={2.2} />, label: "Clients" },
                    { id: "items", icon: (color) => <Package size={18} color={color} strokeWidth={2.2} />, label: "Items" }
                ].map(n => {
                    const isActive = tab === n.id;
                    const iconColor = isActive ? "#000" : "var(--text-secondary)";
                    return (
                        <button key={n.id} onClick={() => setTab(n.id)} style={{
                            flex: 1, background: isActive ? "var(--accent-primary)" : "none",
                            border: "none", borderRadius: "18px", padding: "10px 4px", cursor: "pointer",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                            transition: "all 0.2s", minWidth: "60px"
                        }}>
                            <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>{n.icon(iconColor)}</span>
                            <span style={{ fontSize: "9px", fontWeight: "bold", color: isActive ? "#000" : "var(--text-secondary)", opacity: 0.9 }}>{n.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
