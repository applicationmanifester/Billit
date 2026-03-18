import React from "react";

export const Settings = ({
    user, seller, setSellerForm, setShowSellerModal, authLoading,
    syncStatus, lastSync, invoices, clients, products, fetchFromCloud, logout, clearLocalState,
    signInWithPopup, authError, showToast,
    syncLog, theme, setTheme, toggleTheme, currency, setShowCurrencyPicker,
    taxRates, setTaxRates, defaultTaxId, setDefaultTaxId, wipeAllData, settingsTab, setSettingsTab, isDark,
    exportInvoicesToCSV, exportClientsToCSV, exportProductsToCSV,
    exportFullDataJSON, importFullDataJSON, fullData, setters,
    getClient,
    defaultNote, setDefaultNote,
    hapticsEnabled, setHapticsEnabled, soundEnabled, setSoundEnabled,
    hasAcceptedLegal, viewLegal
}) => {
    const fileInputRef = React.useRef(null);
    return (
        <div style={{ padding: "16px" }} className="animate-slide-up">
            <div className="premium-card" style={{ padding: "20px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ width: "50px", height: "50px", borderRadius: "15px", background: "var(--accent-gradient)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", overflow: "hidden" }}>
                        {seller.logo ? <img src={seller.logo} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🏢"}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "bold", fontSize: "16px" }}>{seller.name}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{seller.email}</div>
                    </div>
                    <button
                        onClick={() => { setSellerForm(seller); setShowSellerModal(true); }}
                        className="secondary-btn"
                        style={{ padding: "8px 16px", borderRadius: "10px", fontSize: "12px", fontWeight: "bold", color: "var(--accent-primary)" }}
                    >
                        Edit
                    </button>
                </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "16px", overflowX: "auto", paddingBottom: "4px" }}>
                {["account", "app", "currency", "taxes", "export"].map(s => (
                    <button key={s} onClick={() => setSettingsTab(s)} style={{
                        padding: "8px 16px", borderRadius: "12px", whiteSpace: "nowrap", border: `1px solid ${settingsTab === s ? "var(--accent-primary)" : "var(--border-primary)"}`,
                        background: settingsTab === s ? "var(--accent-primary)" : "var(--bg-card)", color: settingsTab === s ? "#000" : "var(--text-secondary)", fontSize: "12px", fontWeight: "bold"
                    }}>{s === "export" ? "EXPORT/IMPORT" : s.toUpperCase()}</button>
                ))}
            </div>

            {settingsTab === "app" && (
                <div className="premium-card" style={{ padding: "0 16px", marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", alignItems: "center", borderBottom: `1px solid var(--border-primary)` }}>
                        <div style={{ fontSize: "14px" }}>Theme Mode</div>
                        <button onClick={toggleTheme} className="secondary-btn" style={{ padding: "8px 12px", fontSize: "16px" }}>{isDark ? "🌙 Dark" : "☀️ Light"}</button>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", alignItems: "center", borderBottom: `1px solid var(--border-primary)` }}>
                        <div style={{ fontSize: "14px" }}>Haptic Feedback</div>
                        <button 
                            onClick={() => setHapticsEnabled(!hapticsEnabled)} 
                            className="secondary-btn" 
                            style={{ padding: "8px 12px", border: hapticsEnabled ? "1px solid var(--accent-primary)" : "1px solid var(--border-primary)", background: hapticsEnabled ? "rgba(245, 200, 66, 0.1)" : "transparent" }}
                        >
                            {hapticsEnabled ? "📳 Enabled" : "🔇 Disabled"}
                        </button>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", alignItems: "center", borderBottom: `1px solid var(--border-primary)` }}>
                        <div style={{ fontSize: "14px" }}>Sound Effects</div>
                        <button 
                            onClick={() => setSoundEnabled(!soundEnabled)} 
                            className="secondary-btn" 
                            style={{ padding: "8px 12px", border: soundEnabled ? "1px solid var(--accent-primary)" : "1px solid var(--border-primary)", background: soundEnabled ? "rgba(245, 200, 66, 0.1)" : "transparent" }}
                        >
                            {soundEnabled ? "🔊 Enabled" : "🔇 Disabled"}
                        </button>
                    </div>

                    <div style={{ padding: "14px 0", borderBottom: `1px solid var(--border-primary)` }}>
                        <div style={{ fontSize: "14px", marginBottom: "8px" }}>Default Payment Due Days</div>
                        <input
                            type="number"
                            className="input-field"
                            style={{ width: "100%" }}
                            placeholder="e.g. 7"
                            value={seller.defaultDueDays || ""}
                            onChange={(e) => setSellerForm({ ...seller, defaultDueDays: Math.max(0, parseInt(e.target.value) || 0) })}
                        />
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>New invoices will automatically set the due date to "Today + X days".</div>
                    </div>

                    <div style={{ padding: "14px 0" }}>
                        <div style={{ fontSize: "14px", marginBottom: "8px" }}>Predefined Note</div>
                        <textarea
                            className="input-field"
                            style={{ height: "80px", resize: "none" }}
                            placeholder="This note will automatically appear on new invoices..."
                            value={defaultNote}
                            onChange={(e) => setDefaultNote(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {settingsTab === "account" && (
                <div className="premium-card" style={{ padding: "24px", marginBottom: "20px" }}>
                    {authLoading ? (
                        <div style={{ textAlign: "center", padding: "20px" }}>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Checking Authentication...</div>
                        </div>
                    ) : user ? (
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "40px", marginBottom: "12px" }}>✅</div>
                            <div style={{ fontWeight: "bold", fontSize: "18px", marginBottom: "4px" }}>Synced with Google Cloud</div>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "2px" }}>{user.displayName || "Google User"}</div>
                            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>{user.email}</div>

                            <div style={{ background: "var(--bg-input)", borderRadius: "15px", padding: "16px", marginBottom: "20px", border: `1px solid var(--border-primary)`, textAlign: "left" }}>
                                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px", fontWeight: "bold", textTransform: "uppercase" }}>Cloud Sync Status</div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                    <span style={{ fontSize: "14px" }}>Status</span>
                                    <span style={{ fontSize: "14px", fontWeight: "bold", color: syncStatus === "synced" ? "var(--status-paid)" : ["saving", "loading"].includes(syncStatus) ? "var(--accent-primary)" : syncStatus === "error" ? "#ef4444" : "var(--text-primary)" }}>
                                        {syncStatus.charAt(0).toUpperCase() + syncStatus.slice(1)}
                                    </span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                    <span style={{ fontSize: "14px" }}>Last Sync</span>
                                    <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{lastSync || "Never"}</span>
                                </div>
                                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "20px" }}>
                                    Auto-sync runs in near real-time (about 1 second after changes).
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontWeight: "bold", fontSize: "18px" }}>{invoices.length}</div>
                                        <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Invoices</div>
                                    </div>
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontWeight: "bold", fontSize: "18px" }}>{clients.length}</div>
                                        <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Clients</div>
                                    </div>
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontWeight: "bold", fontSize: "18px" }}>{products.length}</div>
                                        <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Items</div>
                                    </div>
                                </div>

                                <button onClick={() => fetchFromCloud(user.uid)} disabled={["saving", "loading"].includes(syncStatus)} className="secondary-btn" style={{
                                    width: "100%", color: "var(--accent-primary)", fontSize: "13px",
                                    opacity: (["saving", "loading"].includes(syncStatus)) ? 0.5 : 1,
                                    marginBottom: "10px"
                                }}>
                                    {["saving", "loading"].includes(syncStatus) ? "Syncing..." : "🔄 Force Fetch from Cloud"}
                                </button>

                                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: "bold" }}>Recent Sync Activity</div>
                                <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "10px", padding: "10px", maxHeight: "150px", overflowY: "auto", fontSize: "11px", fontFamily: "monospace", border: "1px solid var(--border-primary)" }}>
                                    {syncLog && syncLog.length > 0 ? (
                                        syncLog.map((log, i) => {
                                            const rawMessage = typeof log === "string" ? log : log?.message;
                                            const message = rawMessage || "Sync event";
                                            const timestamp = typeof log === "object" ? log?.timestamp : null;
                                            const parsedDate = timestamp ? new Date(timestamp) : null;
                                            const hasValidTime = parsedDate && !Number.isNaN(parsedDate.getTime());

                                            return (
                                                <div key={i} style={{ marginBottom: "4px", borderBottom: i < syncLog.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", paddingBottom: "2px" }}>
                                                    {hasValidTime ? <span style={{ opacity: 0.5 }}>[{parsedDate.toLocaleTimeString()}] </span> : null}
                                                    {message}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div style={{ opacity: 0.5 }}>No sync logs yet.</div>
                                    )}
                                </div>
                            </div>

                            <button onClick={() => logout().then(clearLocalState)} style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "none", border: `1px solid var(--border-primary)`, color: "#ef4444", fontWeight: "bold", cursor: "pointer" }}>Logout from Account</button>
                        </div>
                    ) : (
                        <div style={{ textAlign: "center" }}>
                            <h3 style={{ marginTop: 0 }}>Sync Account</h3>
                            {!hasAcceptedLegal && (
                                <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid var(--accent-primary)", borderRadius: "12px", padding: "16px", marginBottom: "16px", textAlign: "left", fontSize: "13px" }}>
                                    <span style={{ fontWeight: "bold", display: "block", marginBottom: "4px", color: "var(--accent-primary)" }}>⚠️ Action Required</span>
                                    You must accept the Terms & Privacy Policy before enabling Google Cloud Sync.
                                </div>
                            )}
                            {hasAcceptedLegal ? (
                                <button onClick={signInWithPopup} className="premium-card" style={{ width: "100%", padding: "16px", background: "#fff", color: "#000", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", cursor: "pointer", borderRadius: "12px", marginBottom: "12px" }}>
                                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style={{ width: "20px" }} alt="Google" />
                                    Sign in with Google (Popup)
                                </button>
                            ) : (
                                <button
                                    onClick={() => showToast("Please accept Terms & Privacy Policy in the link below first!", "error")}
                                    className="premium-card"
                                    style={{
                                        width: "100%", padding: "16px", background: "var(--bg-input)", color: "var(--text-secondary)",
                                        fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                                        cursor: "not-allowed", borderRadius: "12px", marginBottom: "12px", border: "1px dashed var(--border-primary)",
                                        opacity: 0.7
                                    }}
                                >
                                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style={{ width: "20px", opacity: 0.5 }} alt="Google" />
                                    Please Accept Terms to Enable Sign In
                                </button>
                            )}

                            <button
                                onClick={viewLegal}
                                style={{
                                    background: "none", border: "none", color: "var(--accent-primary)",
                                    fontSize: "12px", textDecoration: "underline", cursor: "pointer",
                                    marginTop: "8px"
                                }}
                            >
                                View Billit - Terms & Privacy Policy
                            </button>
                            {authError && (
                                <div style={{ marginTop: "10px", fontSize: "12px", color: "#ef4444", fontWeight: "600" }}>
                                    {authError}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {settingsTab === "currency" && (
                <div className="premium-card" style={{ padding: "16px", marginBottom: "20px" }}>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>ACTIVE CURRENCY</div>
                    <div onClick={() => setShowCurrencyPicker(true)} style={{ display: "flex", justifyContent: "space-between", padding: "16px", background: "var(--bg-input)", borderRadius: "12px", border: `1px solid var(--border-primary)`, cursor: "pointer" }}>
                        <div style={{ fontSize: "15px", fontWeight: "bold" }}>{currency.name}</div>
                        <div style={{ color: "var(--accent-primary)", fontWeight: "bold" }}>{currency.code} ({currency.symbol})</div>
                    </div>
                </div>
            )}

            {settingsTab === "taxes" && (
                <div className="premium-card" style={{ padding: "16px", marginBottom: "20px" }}>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>TAX RATES POOL</div>
                    {taxRates.map((tr, idx) => (
                        <div key={tr.id} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid var(--border-primary)`, alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                                <button onClick={() => {
                                    if (taxRates.length <= 1) return;
                                    const usedInDrafts = (invoices || []).filter(inv => inv.status === "draft" && inv.items.some(item => item.taxId === tr.id));
                                    if (usedInDrafts.length > 0) {
                                        return showToast(`Cannot delete! This tax is used in ${usedInDrafts.length} draft invoices. Remove it from drafts first.`, "error");
                                    }
                                    setTaxRates(prev => prev.filter(t => t.id !== tr.id));
                                }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>✕</button>
                                <input style={{ background: "none", border: "none", color: "var(--text-primary)", fontSize: "14px", width: "100%", outline: "none" }} value={tr.label} onChange={(e) => setTaxRates(prev => prev.map(t => t.id === tr.id ? { ...t, label: e.target.value } : t))} />
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <input type="number" className="input-field" style={{ width: "60px", padding: "6px", textAlign: "center" }} value={tr.rate} onChange={(e) => setTaxRates(prev => prev.map(t => t.id === tr.id ? { ...t, rate: Math.max(0, Number(e.target.value)) } : t))} />
                                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>%</span>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => setTaxRates([...taxRates, { id: crypto.randomUUID(), label: "New Tax", rate: 0 }])} className="secondary-btn" style={{ width: "100%", borderStyle: "dashed", color: "var(--accent-primary)", marginTop: "12px" }}>+ Add Tax Rate</button>
                </div>
            )}

            {settingsTab === "export" && (
                <div className="premium-card" style={{ padding: "20px", marginBottom: "20px" }}>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px", fontWeight: "bold", textTransform: "uppercase" }}>Data Portability</div>
                    <div style={{ display: "grid", gap: "16px" }}>
                        <button onClick={() => exportInvoicesToCSV(invoices, getClient, taxRates)} className="secondary-btn" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>📄 Export Invoices</span>
                            <span style={{ fontSize: "12px", opacity: 0.6 }}>CSV</span>
                        </button>
                        <button onClick={() => exportClientsToCSV(clients)} className="secondary-btn" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>👥 Export Clients</span>
                            <span style={{ fontSize: "12px", opacity: 0.6 }}>CSV</span>
                        </button>
                        <button onClick={() => exportProductsToCSV(products)} className="secondary-btn" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>📦 Export Inventory</span>
                            <span style={{ fontSize: "12px", opacity: 0.6 }}>CSV</span>
                        </button>

                        <div style={{ height: "1px", background: "var(--border-color)", margin: "8px 0" }} />

                        <button onClick={() => exportFullDataJSON(fullData)} className="premium-btn" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "12px 16px" }}>
                            <span>💾 Full Backup Data Download</span>
                            <span style={{ fontSize: "12px", opacity: 0.8 }}>JSON</span>
                        </button>

                        <button onClick={() => fileInputRef.current?.click()} className="secondary-btn" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>📥 Restore Data Backup</span>
                            <span style={{ fontSize: "12px", opacity: 0.6 }}>JSON</span>
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            accept=".json"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    importFullDataJSON(file, setters, showToast);
                                    e.target.value = ""; // Reset for next selection
                                }
                            }}
                        />
                    </div>
                </div>
            )}

            <div className="premium-card" style={{ padding: "16px", background: "var(--accent-gradient)", color: "#000", textAlign: "left", marginBottom: "20px" }}>
                <div style={{ fontWeight: "900", fontSize: "14px", marginBottom: "12px" }}>Report & Feedback</div>
                <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
                    <button onClick={() => window.location.href = 'mailto:applicationmanifester@gmail.com'} style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "#000", color: "#fff", border: "none", fontWeight: "bold", fontSize: "12px", cursor: "pointer" }}>Contact Creator</button>
                    <button onClick={() => { navigator.clipboard.writeText('applicationmanifester@gmail.com'); showToast('Email copied to clipboard!'); }} style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "rgba(0,0,0,0.1)", color: "#000", border: "1px solid rgba(0,0,0,0.2)", fontWeight: "bold", fontSize: "12px", cursor: "pointer" }}>Copy Email to Clipboard</button>
                </div>
            </div>

            <div style={{
                padding: "24px",
                borderRadius: "16px",
                border: "1px solid #ef444433",
                marginTop: "24px",
                background: "rgba(239, 68, 68, 0.05)"
            }}>
                <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#ef4444", fontWeight: "bold" }}>DANGER ZONE: This will permanently delete ALL data from your device and cloud storage.</p>
                <button onClick={wipeAllData} style={{ width: "100%", padding: "16px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "bold" }}>Wipe All Data</button>
            </div>
        </div>
    );
};
