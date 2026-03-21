import React from "react";

export const SellerModal = ({ showSellerModal, setShowSellerModal, sellerForm, setSellerForm, setSeller, showToast, compressImage }) => {
    if (!showSellerModal) return null;

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 400, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }} onClick={(e) => e.target === e.currentTarget && setShowSellerModal(false)}>
            <div className="premium-card animate-scale-in" style={{ width: "100%", maxWidth: "440px", padding: "0 0 32px", position: "relative", overflow: "hidden" }}>
                {/* Sticky Header */}
                <div style={{ position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 10, padding: "24px 32px 16px", borderBottom: "1px solid var(--border-primary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ margin: 0, fontSize: "18px" }}>Business Profile</h2>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <button onClick={() => {
                            if (!sellerForm.name.trim()) return showToast("Business name is required!");
                            setSeller(sellerForm); setShowSellerModal(false); showToast("Profile updated!");
                        }} className="primary-btn" style={{ padding: "8px 16px", fontSize: "12px", borderRadius: "10px" }}>Save</button>
                        <button onClick={() => setShowSellerModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-secondary)" }}>✕</button>
                    </div>
                </div>

                <div style={{ padding: "32px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                        <div style={{ textAlign: "center" }}>
                            <label style={{ cursor: "pointer" }}>
                                <div style={{ width: "80px", height: "80px", borderRadius: "20px", background: "var(--bg-input)", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `2px dashed ${sellerForm.logo ? "var(--accent-primary)" : "var(--border-primary)"}` }}>
                                    {sellerForm.logo ? <img src={sellerForm.logo} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "24px" }}>🖼️</span>}
                                </div>
                                <div style={{ fontSize: "10px", fontWeight: "bold", color: "var(--accent-primary)" }}>UPLOAD LOGO</div>
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
                            {sellerForm.logo && <button onClick={() => setSellerForm({ ...sellerForm, logo: "" })} style={{ background: "none", border: "none", color: "#ef4444", fontSize: "10px", marginTop: "4px" }}>Remove</button>}
                        </div>

                        <div style={{ textAlign: "center" }}>
                            <label style={{ cursor: "pointer" }}>
                                <div style={{ width: "80px", height: "80px", borderRadius: "20px", background: "var(--bg-input)", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `2px dashed ${sellerForm.qrCode ? "var(--accent-primary)" : "var(--border-primary)"}` }}>
                                    {sellerForm.qrCode ? <img src={sellerForm.qrCode} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "24px" }}>📱</span>}
                                </div>
                                <div style={{ fontSize: "10px", fontWeight: "bold", color: "var(--accent-primary)" }}>PAYMENT QR</div>
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
                            {sellerForm.qrCode && <button onClick={() => setSellerForm({ ...sellerForm, qrCode: "" })} style={{ background: "none", border: "none", color: "#ef4444", fontSize: "10px", marginTop: "4px" }}>Remove</button>}
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Business Name</div>
                            <input className="input-field" placeholder="Business Name" value={sellerForm.name} onChange={(e) => setSellerForm({ ...sellerForm, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && (setSeller(sellerForm), setShowSellerModal(false), showToast("Profile updated!"))} />
                        </div>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Tagline / Motto</div>
                            <input className="input-field" placeholder="Tagline / Motto" value={sellerForm.tagline} onChange={(e) => setSellerForm({ ...sellerForm, tagline: e.target.value })} onKeyDown={(e) => e.key === "Enter" && (setSeller(sellerForm), setShowSellerModal(false), showToast("Profile updated!"))} />
                        </div>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Email</div>
                            <input className="input-field" placeholder="Email" value={sellerForm.email} onChange={(e) => setSellerForm({ ...sellerForm, email: e.target.value })} onKeyDown={(e) => e.key === "Enter" && (setSeller(sellerForm), setShowSellerModal(false), showToast("Profile updated!"))} />
                        </div>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Phone</div>
                            <input className="input-field" type="tel" placeholder="Phone" value={sellerForm.phone}
                                onKeyDown={(e) => e.key === "Enter" && (setSeller(sellerForm), setShowSellerModal(false), showToast("Profile updated!"))}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9+]/g, '');
                                    setSellerForm({ ...sellerForm, phone: val });
                                }}
                            />
                        </div>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>GSTIN (Optional)</div>
                            <input className="input-field" placeholder="GSTIN (Optional)" value={sellerForm.gstin} onChange={(e) => setSellerForm({ ...sellerForm, gstin: e.target.value })} onKeyDown={(e) => e.key === "Enter" && (setSeller(sellerForm), setShowSellerModal(false), showToast("Profile updated!"))} />
                        </div>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Invoice Prefix</div>
                            <input className="input-field" placeholder="Invoice Prefix (e.g. INV)" value={sellerForm.invoicePrefix} onChange={(e) => setSellerForm({ ...sellerForm, invoicePrefix: e.target.value })} onKeyDown={(e) => e.key === "Enter" && (setSeller(sellerForm), setShowSellerModal(false), showToast("Profile updated!"))} />
                        </div>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Default Payment Due Days</div>
                            <input className="input-field" type="number" placeholder="e.g. 7" value={sellerForm.defaultDueDays || ""} onChange={(e) => setSellerForm({ ...sellerForm, defaultDueDays: Math.max(0, parseInt(e.target.value) || 0) })} onKeyDown={(e) => e.key === "Enter" && (setSeller(sellerForm), setShowSellerModal(false), showToast("Profile updated!"))} />
                        </div>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Full Address</div>
                            <textarea className="input-field" placeholder="Full Address" style={{ height: "80px", paddingTop: "12px" }} value={sellerForm.address}
                                onFocus={(e) => e.target.scrollIntoView({ behavior: "smooth", block: "center" })}
                                onChange={(e) => setSellerForm({ ...sellerForm, address: e.target.value })}
                                onKeyDown={(e) => e.key === "Enter" && (setSeller(sellerForm), setShowSellerModal(false), showToast("Profile updated!"))}
                            />
                        </div>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px", marginLeft: "4px" }}>Location URL (Google Maps)</div>
                            <input className="input-field" placeholder="https://maps.google.com/..." value={sellerForm.locationUrl || ""} 
                                onChange={(e) => setSellerForm({ ...sellerForm, locationUrl: e.target.value })} 
                                onKeyDown={(e) => e.key === "Enter" && (setSeller(sellerForm), setShowSellerModal(false), showToast("Profile updated!"))} 
                            />
                        </div>
                    </div>

                    <button onClick={() => {
                        if (!sellerForm.name.trim()) return showToast("Business name is required!");
                        setSeller(sellerForm);
                        setShowSellerModal(false);
                        showToast("Profile updated!");
                    }} className="primary-btn" style={{ width: "100%", padding: "16px" }}>Save Business Profile</button>
                </div>
            </div>
        </div>
    );
};
