import React, { useState, useEffect } from "react";

export const LegalModal = ({ show, onAccept, onClose, onDecline, hasAcceptedLegal }) => {
    const [checked, setChecked] = useState(hasAcceptedLegal || false);
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(hasAcceptedLegal || false);

    // Sync state whenever modal is opened
    useEffect(() => {
        if (show) {
            setChecked(hasAcceptedLegal || false);
            setHasScrolledToBottom(hasAcceptedLegal || false);
        }
    }, [show, hasAcceptedLegal]);

    if (!show) return null;

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        // Check if within 30px of bottom
        if (scrollHeight - scrollTop <= clientHeight + 30) {
            setHasScrolledToBottom(true);
        }
    };

    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 9999,
            display: "flex", flexDirection: "column", padding: "clamp(12px, 3vw, 40px)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            overflow: "hidden", animation: "fadeInScale 0.4s ease-out"
        }}>
            <div style={{
                maxWidth: "900px", margin: "0 auto", width: "100%", height: "100%",
                display: "flex", flexDirection: "column", position: "relative"
            }}>
                <div style={{ 
                    display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px",
                    background: "rgba(255,255,255,0.03)", padding: "16px 24px", borderRadius: "16px",
                    border: "1px solid var(--border-primary)"
                }}>
                    <button onClick={onClose} style={{ 
                        background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-primary)", 
                        borderRadius: "50%", width: "44px", height: "44px", display: "flex", 
                        alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff",
                        transition: "all 0.2s"
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "900", color: "var(--accent-primary)", letterSpacing: "-0.5px" }}>Business Terms & Conditions</h1>
                        <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>Last updated: April 2026</p>
                    </div>
                </div>

                <div
                    onScroll={handleScroll}
                    style={{
                        flex: 1, overflowY: "auto", padding: "clamp(24px, 5vw, 48px)", 
                        background: "var(--bg-secondary)", borderRadius: "24px", 
                        border: "1px solid var(--border-primary)", fontSize: "15px", 
                        lineHeight: "1.8", color: "var(--text-secondary)", marginBottom: "24px", 
                        boxShadow: "0 20px 50px rgba(0,0,0,0.4)", scrollbarWidth: "thin",
                        scrollbarColor: "var(--accent-primary) transparent"
                    }}
                >
                    <h2 style={{ color: "var(--accent-primary)", fontSize: "20px", fontWeight: "900", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ opacity: 0.5 }}>01.</span> Scope of Digital Services
                    </h2>
                    <p>Welcome to <strong>Billit - Professional Billing Ecosystem</strong>. By utilizing our suite of tools, automated PDF generators, and cloud synchronization features, you formally agree to the following operational parameters:</p>
                    <ul style={{ paddingLeft: "1.2em", marginBottom: "40px" }}>
                        <li><strong>Platform Purpose</strong>: Billit is designed exclusively for professional B2B/B2C invoicing, real-time inventory tracking, and client lifecycle management.</li>
                        <li><strong>Financial Integrity</strong>: Users are responsible for the accuracy of tax calculations, GST/VAT compliance, and currency conversions generated within the app.</li>
                        <li><strong>Automated Engines</strong>: The PDF generation engine is a local computing resource. While calibrated for professional output, final verification of document layouts remains user responsibility.</li>
                        <li><strong>Connectivity</strong>: While core features operate offline via IndexedDB, premium cloud features require active Google Cloud Service integration.</li>
                    </ul>

                    <h2 style={{ color: "var(--accent-primary)", fontSize: "20px", fontWeight: "900", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ opacity: 0.5 }}>02.</span> Subscription & Payment Policy
                    </h2>
                    <p>To support global infrastructure and continuous engineering, certain features are managed under a subscription model:</p>
                    <ul style={{ paddingLeft: "1.2em", marginBottom: "40px" }}>
                        <li><strong>Subscription Tiers</strong>: Professional and Business Elite tiers grant access to cloud-sync, white-labeling, and advanced analytics.</li>
                        <li><strong>Billing Cycles</strong>: Payments are processed via secure Stripe gateways. Subscription auto-renewal can be managed or deactivated through the Billit Dashboard.</li>
                        <li><strong>Refund Policy</strong>: Due to the nature of digital SaaS activation, refunds are handled on a case-by-case basis as outlined in our Global Commerce Policy.</li>
                    </ul>

                    <h2 style={{ color: "var(--accent-primary)", fontSize: "20px", fontWeight: "900", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ opacity: 0.5 }}>03.</span> Data Sovereignty & Privacy
                    </h2>
                    <p>We implement a "Privacy by Design" architecture to ensure your business intelligence remains your own:</p>
                    <ul style={{ paddingLeft: "1.2em", marginBottom: "40px" }}>
                        <li><strong>Information Custody</strong>: Your data (Clients, Inventory, Invoices) is stored primarily on your device. Billit does not have access to your private database unless synced to Google Cloud.</li>
                        <li><strong>Encryption</strong>: Multi-device synchronization utilizes AES-256 level encryption via Google Firebase Security Rules.</li>
                        <li><strong>Accountability</strong>: We do not sell, trade, or monetize your business records. Our revenue is derived purely from subscription fees.</li>
                    </ul>

                    <h2 style={{ color: "var(--accent-primary)", fontSize: "20px", fontWeight: "900", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ opacity: 0.5 }}>04.</span> Limitation of Liability
                    </h2>
                    <p>Billit is provided on an "as-available" basis. We are not liable for business interruptions, data loss due to local browser clearing without cloud backup, or inaccuracies in tax reporting arising from user input errors.</p>

                    {!hasScrolledToBottom && (
                        <div style={{
                            textAlign: "center", padding: "16px", color: "var(--accent-primary)",
                            fontWeight: "900", border: "2px dashed var(--accent-primary)",
                            background: "rgba(245, 200, 66, 0.05)", borderRadius: "12px",
                            margin: "40px 0", animation: "pulse 2s infinite",
                            fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px"
                        }}>
                            ↓ Please review the full document to continue ↓
                        </div>
                    )}
                </div>

                <div
                    style={{
                        padding: "32px",
                        borderRadius: "24px",
                        border: checked ? "2px solid var(--accent-primary)" : "1px solid var(--border-primary)",
                        background: checked ? "rgba(245, 200, 66, 0.04)" : "rgba(255,255,255,0.02)",
                        opacity: hasScrolledToBottom ? 1 : 0.6,
                        transition: "all 0.3s ease",
                        boxShadow: checked ? "0 0 40px rgba(245, 200, 66, 0.1)" : "none"
                    }}
                >
                    <label style={{
                        display: "flex", alignItems: "flex-start", gap: "20px",
                        cursor: hasScrolledToBottom ? "pointer" : "not-allowed"
                    }}>
                        <div style={{ position: "relative" }}>
                            <input
                                type="checkbox"
                                checked={checked}
                                disabled={!hasScrolledToBottom}
                                onChange={(e) => setChecked(e.target.checked)}
                                style={{
                                    width: "28px", height: "28px", accentColor: "var(--accent-primary)",
                                    cursor: hasScrolledToBottom ? "pointer" : "not-allowed",
                                    borderRadius: "8px"
                                }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: "15px", lineHeight: "1.6", color: "#ffffff", fontWeight: "600" }}>
                                Legal Consent
                            </p>
                            <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", marginTop: "4px" }}>
                                I formally acknowledge and agree to the <strong>Billit Professional Terms of Service</strong> and <strong>Data Privacy Policy</strong>.
                            </p>
                        </div>
                    </label>

                    <div style={{ display: "flex", gap: "16px", marginTop: "32px" }}>
                        <button 
                            className="secondary-btn" 
                            style={{ flex: 1, padding: "18px", borderRadius: "14px", fontWeight: "700" }} 
                            onClick={onDecline || onClose}
                        >
                            Decide Later
                        </button>
                        <button
                            className="primary-btn"
                            style={{
                                flex: 2, padding: "18px", borderRadius: "14px",
                                fontWeight: "900", textTransform: "uppercase",
                                letterSpacing: "1px",
                                opacity: (checked && hasScrolledToBottom) ? 1 : 0.5,
                                cursor: (checked && hasScrolledToBottom) ? "pointer" : "not-allowed",
                                background: (checked && hasScrolledToBottom) ? "var(--accent-primary)" : "var(--bg-input)",
                                color: (checked && hasScrolledToBottom) ? "#000" : "var(--text-muted)",
                                border: "none",
                                boxShadow: (checked && hasScrolledToBottom) ? "0 10px 20px -5px rgba(245, 200, 66, 0.4)" : "none"
                            }}
                            onClick={() => checked && hasScrolledToBottom && onAccept()}
                            disabled={!checked || !hasScrolledToBottom}
                        >
                            Accept & Initialize Sync
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
