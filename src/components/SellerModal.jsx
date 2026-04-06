import React from "react";

export const SellerModal = ({ showSellerModal, setShowSellerModal, sellerForm, setSellerForm, setSeller, showToast, compressImage }) => {
    if (!showSellerModal) return null;

    return (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "calc(20px + var(--safe-area-top)) 20px 40px", overflowY: "auto" }} onClick={(e) => e.target === e.currentTarget && setShowSellerModal(false)}>
            <div className="premium-card animate-slide-in modal-card modal-content-wrapper" style={{ width: "100%", maxWidth: "440px", padding: "0 0 32px", position: "relative", overflow: "hidden", borderRadius: "20px" }}>
                {/* Sticky Header */}
                <div style={{ position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 10, padding: "20px 24px", borderBottom: "1px solid var(--border-primary)", display: "flex", alignItems: "center", gap: "12px" }}>
                    <button onClick={() => setShowSellerModal(false)} style={{ background: "rgba(0,0,0,0.05)", border: "none", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-primary)" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    </button>
                    <h2 style={{ margin: 0, fontSize: "18px", flex: 1 }}>Business Profile</h2>
                    <button onClick={() => {
                        const name = sellerForm.name?.trim();
                        if (!name) return showToast("Business name is required!");
                        setSeller({ ...sellerForm, name });
                        setShowSellerModal(false);
                        showToast("Profile updated!");
                    }} className="primary-btn" style={{ padding: "8px 16px", fontSize: "12px", borderRadius: "10px" }}>Save</button>
                </div>

                <div style={{ padding: "32px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "24px" }}>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ position: "relative", width: "70px", margin: "0 auto" }}>
                                <label style={{ cursor: "pointer" }}>
                                    <div style={{ width: "70px", height: "70px", borderRadius: "16px", background: "var(--bg-input)", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `2px dashed ${sellerForm.logo ? "var(--accent-primary)" : "var(--border-primary)"}` }}>
                                        {sellerForm.logo ? <img src={sellerForm.logo} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "20px" }}>🏢</span>}
                                    </div>
                                    <div style={{ fontSize: "9px", fontWeight: "bold", color: "var(--accent-primary)" }}>LOGO</div>
                                    <input type="file" hidden accept="image/*" onChange={async (e) => {
                                        if (e.target.files[0]) {
                                            const reader = new FileReader();
                                            reader.onload = async (re) => {
                                                const compressed = await compressImage(re.target.result);
                                                setSellerForm({ ...sellerForm, logo: compressed });
                                            };
                                            reader.readAsDataURL(e.target.files[0]);
                                        }
                                    }} />
                                </label>
                                {sellerForm.logo && (
                                    <button 
                                        onClick={(e) => { e.preventDefault(); setSellerForm({ ...sellerForm, logo: "" }); }} 
                                        style={{ position: "absolute", top: "-8px", right: "-8px", width: "20px", height: "20px", borderRadius: "50%", background: "#ef4444", color: "white", border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", cursor: "pointer", boxShadow: "0 2px 5px rgba(0,0,0,0.2)", zIndex: 10 }}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <input 
                                style={{ width: "90%", background: "none", border: "none", borderBottom: "1px solid var(--border-primary)", fontSize: "9px", textAlign: "center", color: "var(--text-primary)", marginTop: "4px", outline: "none" }}
                                placeholder="Logo Name"
                                value={sellerForm.logoName || ""}
                                onChange={(e) => setSellerForm({ ...sellerForm, logoName: e.target.value })}
                            />
                        </div>


                        <div style={{ textAlign: "center" }}>
                            <div style={{ position: "relative", width: "70px", margin: "0 auto" }}>
                                <label style={{ cursor: "pointer" }}>
                                    <div style={{ width: "70px", height: "70px", borderRadius: "16px", background: "var(--bg-input)", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `2px dashed ${sellerForm.qrCode ? "var(--accent-primary)" : "var(--border-primary)"}` }}>
                                        {sellerForm.qrCode ? <img src={sellerForm.qrCode} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "20px" }}>📱</span>}
                                    </div>
                                    <div style={{ fontSize: "9px", fontWeight: "bold", color: "var(--accent-primary)" }}>PAYMENT QR</div>
                                    <input type="file" hidden accept="image/*" onChange={async (e) => {
                                        if (e.target.files[0]) {
                                            const reader = new FileReader();
                                            reader.onload = async (re) => {
                                                const compressed = await compressImage(re.target.result);
                                                setSellerForm({ ...sellerForm, qrCode: compressed });
                                            };
                                            reader.readAsDataURL(e.target.files[0]);
                                        }
                                    }} />
                                </label>
                                {sellerForm.qrCode && (
                                    <button 
                                        onClick={(e) => { e.preventDefault(); setSellerForm({ ...sellerForm, qrCode: "" }); }} 
                                        style={{ position: "absolute", top: "-8px", right: "-8px", width: "20px", height: "20px", borderRadius: "50%", background: "#ef4444", color: "white", border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", cursor: "pointer", boxShadow: "0 2px 5px rgba(0,0,0,0.2)", zIndex: 10 }}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <input 
                                style={{ width: "90%", background: "none", border: "none", borderBottom: "1px solid var(--border-primary)", fontSize: "9px", textAlign: "center", color: "var(--text-primary)", marginTop: "4px", outline: "none" }}
                                placeholder="UPI / Label"
                                value={sellerForm.qrLabel || ""}
                                onChange={(e) => setSellerForm({ ...sellerForm, qrLabel: e.target.value })}
                            />
                        </div>

                        <div style={{ textAlign: "center" }}>
                            <div style={{ position: "relative", width: "70px", margin: "0 auto" }}>
                                <label style={{ cursor: "pointer" }}>
                                    <div style={{ width: "70px", height: "70px", borderRadius: "16px", background: "var(--bg-input)", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `2px dashed ${sellerForm.signature ? "var(--accent-primary)" : "var(--border-primary)"}` }}>
                                        {sellerForm.signature ? <img src={sellerForm.signature} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: "20px" }}>✍️</span>}
                                    </div>
                                    <div style={{ fontSize: "9px", fontWeight: "bold", color: "var(--accent-primary)" }}>SIGNATURE</div>
                                    <input type="file" hidden accept="image/*" onChange={async (e) => {
                                        if (e.target.files[0]) {
                                            const reader = new FileReader();
                                            reader.onload = async (re) => {
                                                const compressed = await compressImage(re.target.result, 0.4);
                                                setSellerForm({ ...sellerForm, signature: compressed });
                                            };
                                            reader.readAsDataURL(e.target.files[0]);
                                        }
                                    }} />
                                </label>
                                {sellerForm.signature && (
                                    <button 
                                        onClick={(e) => { e.preventDefault(); setSellerForm({ ...sellerForm, signature: "" }); }} 
                                        style={{ position: "absolute", top: "-8px", right: "-8px", width: "20px", height: "20px", borderRadius: "50%", background: "#ef4444", color: "white", border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", cursor: "pointer", boxShadow: "0 2px 5px rgba(0,0,0,0.2)", zIndex: 10 }}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <input 
                                style={{ width: "90%", background: "none", border: "none", borderBottom: "1px solid var(--border-primary)", fontSize: "9px", textAlign: "center", color: "var(--text-primary)", marginTop: "4px", outline: "none" }}
                                placeholder="Signatory Name"
                                value={sellerForm.signatoryName || ""}
                                onChange={(e) => setSellerForm({ ...sellerForm, signatoryName: e.target.value })}
                            />
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Business Name <span style={{color: '#ef4444'}}>*</span></div>
                            <input className="input-field" placeholder="Business Name" value={sellerForm.name} onChange={(e) => setSellerForm({ ...sellerForm, name: e.target.value })} 
                                onKeyDown={(e) => {
                                    if(e.key === "Enter") {
                                        const name = sellerForm.name?.trim();
                                        if (!name) return showToast("Business name is required!");
                                        setSeller({ ...sellerForm, name }); setShowSellerModal(false); showToast("Profile updated!");
                                    }
                                }}
                            />
                        </div>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Tagline / Motto</div>
                            <input className="input-field" placeholder="Tagline / Motto" value={sellerForm.tagline} onChange={(e) => setSellerForm({ ...sellerForm, tagline: e.target.value })} 
                                onKeyDown={(e) => {
                                    if(e.key === "Enter") {
                                        const name = sellerForm.name?.trim();
                                        if (!name) return showToast("Business name is required!");
                                        setSeller({ ...sellerForm, name }); setShowSellerModal(false); showToast("Profile updated!");
                                    }
                                }}
                            />
                        </div>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Email</div>
                            <input className="input-field" placeholder="Email" value={sellerForm.email} onChange={(e) => setSellerForm({ ...sellerForm, email: e.target.value })} 
                                onKeyDown={(e) => {
                                    if(e.key === "Enter") {
                                        const name = sellerForm.name?.trim();
                                        if (!name) return showToast("Business name is required!");
                                        setSeller({ ...sellerForm, name }); setShowSellerModal(false); showToast("Profile updated!");
                                    }
                                }}
                            />
                        </div>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Phone</div>
                            <input className="input-field" type="tel" placeholder="Phone" value={sellerForm.phone}
                                onKeyDown={(e) => {
                                    if(e.key === "Enter") {
                                        const name = sellerForm.name?.trim();
                                        if (!name) return showToast("Business name is required!");
                                        setSeller({ ...sellerForm, name }); setShowSellerModal(false); showToast("Profile updated!");
                                    }
                                }}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9+]/g, '');
                                    setSellerForm({ ...sellerForm, phone: val });
                                }}
                            />
                        </div>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>GSTIN (Optional)</div>
                            <input className="input-field" placeholder="GSTIN (Optional)" value={sellerForm.gstin} onChange={(e) => setSellerForm({ ...sellerForm, gstin: e.target.value })} 
                                onKeyDown={(e) => {
                                    if(e.key === "Enter") {
                                        const name = sellerForm.name?.trim();
                                        if (!name) return showToast("Business name is required!");
                                        setSeller({ ...sellerForm, name }); setShowSellerModal(false); showToast("Profile updated!");
                                    }
                                }}
                            />
                        </div>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Invoice Prefix</div>
                            <input className="input-field" placeholder="Invoice Prefix (e.g. INV)" value={sellerForm.invoicePrefix} onChange={(e) => setSellerForm({ ...sellerForm, invoicePrefix: e.target.value })} 
                                onKeyDown={(e) => {
                                    if(e.key === "Enter") {
                                        const name = sellerForm.name?.trim();
                                        if (!name) return showToast("Business name is required!");
                                        setSeller({ ...sellerForm, name }); setShowSellerModal(false); showToast("Profile updated!");
                                    }
                                }}
                            />
                        </div>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Default Payment Due Days</div>
                            <input className="input-field" type="number" placeholder="e.g. 7" value={sellerForm.defaultDueDays || ""} onChange={(e) => setSellerForm({ ...sellerForm, defaultDueDays: Math.max(0, parseInt(e.target.value) || 0) })} 
                                onKeyDown={(e) => {
                                    if(e.key === "Enter") {
                                        const name = sellerForm.name?.trim();
                                        if (!name) return showToast("Business name is required!");
                                        setSeller({ ...sellerForm, name }); setShowSellerModal(false); showToast("Profile updated!");
                                    }
                                }}
                            />
                        </div>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Full Address</div>
                            <textarea className="input-field" placeholder="Full Address" style={{ height: "80px", paddingTop: "12px" }} value={sellerForm.address}
                                onFocus={(e) => e.target.scrollIntoView({ behavior: "smooth", block: "center" })}
                                onChange={(e) => setSellerForm({ ...sellerForm, address: e.target.value })}
                                onKeyDown={(e) => {
                                    if(e.key === "Enter") {
                                        const name = sellerForm.name?.trim();
                                        if (!name) return showToast("Business name is required!");
                                        setSeller({ ...sellerForm, name }); setShowSellerModal(false); showToast("Profile updated!");
                                    }
                                }}
                            />
                        </div>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Location URL (Google Maps)</div>
                            <input className="input-field" placeholder="https://maps.google.com/..." value={sellerForm.locationUrl || ""} 
                                onChange={(e) => setSellerForm({ ...sellerForm, locationUrl: e.target.value })} 
                                onKeyDown={(e) => {
                                    if(e.key === "Enter") {
                                        const name = sellerForm.name?.trim();
                                        if (!name) return showToast("Business name is required!");
                                        setSeller({ ...sellerForm, name }); setShowSellerModal(false); showToast("Profile updated!");
                                    }
                                }}
                            />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                                <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginLeft: "4px" }}>Terms & Conditions</div>
                                <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", borderRadius: "20px", color: "var(--accent-primary)", background: "rgba(52, 152, 219, 0.1)", border: "1px solid rgba(52, 152, 219, 0.2)" }} onClick={() => {
                                    const terms = sellerForm.termsList || [];
                                    setSellerForm({ ...sellerForm, termsList: [...terms, ""] });
                                }}>
                                    <span style={{ fontSize: "14px", fontWeight: "bold" }}>+</span> Add New Line
                                </button>
                            </div>
                            {(sellerForm.termsList || [""]).map((term, i) => (
                                <div key={i} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                    <input className="input-field" style={{ flex: 1, margin: 0 }} placeholder={`Rule / Term ${i + 1} (e.g. No returns)`} value={term} onChange={(e) => {
                                        const newList = [...(sellerForm.termsList || [""])];
                                        newList[i] = e.target.value;
                                        setSellerForm({ ...sellerForm, termsList: newList });
                                    }} />
                                    { (sellerForm.termsList || []).length > 1 && (
                                        <button style={{ background: "transparent", border: "none", color: "var(--red-error)", padding: "8px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => {
                                            const newList = (sellerForm.termsList || []).filter((_, idx) => idx !== i);
                                            setSellerForm({ ...sellerForm, termsList: newList });
                                        }}>
                                            <span style={{ fontSize: "18px" }}>×</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ padding: "16px", background: "rgba(0,0,0,0.03)", borderRadius: "16px", marginBottom: "24px", border: "1px solid var(--border-primary)" }}>
                        <div style={{ fontSize: "12px", fontWeight: "bold", color: "var(--accent-primary)", marginBottom: "12px" }}>BANK DETAILS (FOR INVOICE)</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <div>
                                <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Bank Name</div>
                                <input className="input-field" placeholder="e.g. HDFC Bank" style={{ background: "var(--bg-card)" }} value={sellerForm.bankName || ""} onChange={(e) => setSellerForm({ ...sellerForm, bankName: e.target.value })} />
                            </div>
                            <div>
                                <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Account Holder Name</div>
                                <input className="input-field" placeholder="e.g. John Doe" style={{ background: "var(--bg-card)" }} value={sellerForm.accountHolder || ""} onChange={(e) => setSellerForm({ ...sellerForm, accountHolder: e.target.value })} />
                            </div>
                            <div>
                                <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Account Number</div>
                                <input className="input-field" placeholder="e.g. 123456789" style={{ background: "var(--bg-card)" }} value={sellerForm.accountNumber || ""} onChange={(e) => setSellerForm({ ...sellerForm, accountNumber: e.target.value })} />
                            </div>
                            <div>
                                <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>IFSC / SWIFT Code</div>
                                <input className="input-field" placeholder="e.g. HDFC0001234" style={{ background: "var(--bg-card)" }} value={sellerForm.ifscCode || ""} onChange={(e) => setSellerForm({ ...sellerForm, ifscCode: e.target.value })} />
                            </div>
                            <div>
                                <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Branch Name</div>
                                <input className="input-field" placeholder="e.g. Main Branch" style={{ background: "var(--bg-card)" }} value={sellerForm.branch || ""} onChange={(e) => setSellerForm({ ...sellerForm, branch: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <button onClick={() => {
                        const name = sellerForm.name?.trim();
                        if (!name) return showToast("Business name is required!");
                        setSeller({ ...sellerForm, name });
                        setShowSellerModal(false);
                        showToast("Profile updated!");
                    }} className="primary-btn" style={{ width: "100%", padding: "16px" }}>Save Business Profile</button>
                </div>
            </div>
        </div>
    );
};
