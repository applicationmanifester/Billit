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
        // Check if within 20px of bottom
        if (scrollHeight - scrollTop <= clientHeight + 20) {
            setHasScrolledToBottom(true);
        }
    };

    return (
        <div style={{
            position: "fixed", inset: 0, background: "#000000", zIndex: 9999,
            display: "flex", flexDirection: "column", padding: "24px",
            overflow: "hidden", opacity: 1
        }}>
            <div style={{
                maxWidth: "800px", margin: "0 auto", width: "100%", height: "100%",
                display: "flex", flexDirection: "column"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <h1 style={{ margin: 0, fontSize: "24px", color: "var(--accent-primary)" }}>Billit - Terms & Conditions and Privacy Policy</h1>
                    <button onClick={onClose} style={{
                        background: "var(--bg-card)", border: "1px solid var(--border-primary)",
                        padding: "8px 16px", borderRadius: "10px", color: "var(--text-primary)", cursor: "pointer"
                    }}>Close</button>
                </div>

                <div
                    onScroll={handleScroll}
                    style={{
                        flex: 1, overflowY: "auto", padding: "32px", background: "var(--bg-card)",
                        borderRadius: "20px", border: "1px solid var(--border-primary)",
                        fontSize: "14px", lineHeight: "1.8", color: "var(--text-primary)",
                        marginBottom: "24px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
                    }}
                >
                    <h2 style={{ color: "var(--accent-primary)" }}>1. Terms & Conditions</h2>
                    <p>Welcome to <strong>Billit - Professional Billing App</strong>. By accessing or using our application and its accompanying cloud synchronization features, you agree to be bound by these Terms & Conditions:</p>
                    <ul style={{ paddingLeft: "1.5em", marginBottom: "32px" }}>
                        <li><strong>Scope of Service</strong>: Billit provides tools for invoice generation, inventory management, and client tracking.</li>
                        <li><strong>User Obligations</strong>: You agree to use the service for professional billing purposes and maintain the confidentiality of your credentials.</li>
                        <li><strong>Data Ownership</strong>: You retain full ownership of the data you enter into Billit. Our service acts as a repository for your data.</li>
                        <li><strong>Google Synchronization</strong>: Use of Google Cloud Sync is optional and requires explicit acceptance of these terms. We utilize Google's Firebase infrastructure for secure storage.</li>
                    </ul>
                    {!hasScrolledToBottom && (
                        <div style={{
                            textAlign: "center", padding: "12px", color: "var(--accent-primary)",
                            fontWeight: "bold", borderTop: "1px dashed var(--border-primary)",
                            borderBottom: "1px dashed var(--border-primary)",
                            margin: "10px 0", background: "rgba(var(--accent-primary-rgb), 0.05)",
                            borderRadius: "8px"
                        }}>
                            ↓ Please scroll down to the bottom to accept ↓
                        </div>
                    )}

                    <h2 style={{ color: "var(--accent-primary)" }}>2. Privacy Policy</h2>
                    <p>We value your privacy and handle your information with the utmost care:</p>
                    <ul style={{ paddingLeft: "1.5em" }}>
                        <li><strong>Information We Collect</strong>: We store business details, client information, product inventory, and invoice records. This data is stored locally and synced to the cloud if enabled.</li>
                        <li><strong>Authentication Data</strong>: When you sign in with Google, we only access your email address and profile name to create and identify your account across devices.</li>
                        <li><strong>Data Protection</strong>: We do not sell, trade, or otherwise transfer your data to outside parties. Your data is used exclusively to provide you with the app's functionality.</li>
                        <li><strong>Security</strong>: We implement industry-standard security measures provided by Google Cloud Platform to protect your data.</li>
                    </ul>
                </div>

                <div
                    className="premium-card"
                    style={{
                        padding: "24px",
                        border: "2px solid var(--accent-primary)",
                        background: "#1a1a1a",
                        opacity: hasScrolledToBottom ? 1 : 0.6,
                        transition: "all 0.3s ease",
                        boxShadow: hasScrolledToBottom ? "0 0 20px rgba(var(--accent-primary-rgb), 0.2)" : "none"
                    }}
                >
                    <label style={{
                        display: "flex", alignItems: "flex-start", gap: "16px",
                        cursor: hasScrolledToBottom ? "pointer" : "not-allowed"
                    }}>
                        <input
                            type="checkbox"
                            checked={checked}
                            disabled={!hasScrolledToBottom}
                            onChange={(e) => setChecked(e.target.checked)}
                            style={{
                                width: "24px", height: "24px", accentColor: "var(--accent-primary)",
                                marginTop: "4px", cursor: hasScrolledToBottom ? "pointer" : "not-allowed"
                            }}
                        />
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.5", color: "#ffffff" }}>
                                <strong>Consent:</strong> By clicking "Accept", you confirm that you have read and agree to these <strong>Billit - Terms & Conditions and the Privacy Policy</strong>. This is required before enabling cloud sync features.
                            </p>
                        </div>
                    </label>

                    <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                        <button className="secondary-btn" style={{ flex: 1, padding: "16px" }} onClick={() => {
                            if (onDecline) onDecline();
                            else onClose();
                        }}>Decline</button>
                        <button
                            className="primary-btn"
                            style={{
                                flex: 2, padding: "16px",
                                opacity: (checked && hasScrolledToBottom) ? 1 : 0.5,
                                cursor: (checked && hasScrolledToBottom) ? "pointer" : "not-allowed",
                                background: (checked && hasScrolledToBottom) ? "var(--accent-primary)" : "var(--bg-input)"
                            }}
                            onClick={() => checked && hasScrolledToBottom && onAccept()}
                            disabled={!checked || !hasScrolledToBottom}
                        >
                            Accept & Continue
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
