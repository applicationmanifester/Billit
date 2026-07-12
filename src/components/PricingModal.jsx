import React from "react";
import { Check, Zap, Crown, X, Star, ArrowLeft } from "lucide-react";

export const PricingModal = ({ onClose, currentPlan, onUpgrade, currency = { symbol: "$" } }) => {
  const plans = [
    {
      id: "free",
      name: "Free Starter",
      price: "0",
      description: "Perfect for freelancers and side hustles.",
      features: [
        "Up to 100 invoices/month",
        "Unlimited Clients & Items",
        "Local PDF Generation",
        "Standard Thermal Printing",
        "Manual JSON Backups"
      ],
      icon: <Star size={24} color="#94a3b8" />,
      color: "var(--text-secondary)",
      btnText: "Current Plan",
      disabled: true
    },
    {
      id: "pro",
      name: "Professional",
      price: "19",
      period: "/mo",
      description: "Scale your business with professional tools.",
      features: [
        "Up to 500 invoices/month",
        "Real-time Cloud Sync",
        "Multi-device Sign-in",
        "Priority Email Support",
        "Custom Logo & QR Codes",
        "No Billit Branding"
      ],
      icon: <Zap size={24} color="#f5c842" />,
      color: "var(--accent-primary)",
      btnText: "Upgrade to Pro",
      popular: true
    },
    {
      id: "business",
      name: "Business Elite",
      price: "49",
      period: "/mo",
      description: "Maximum power for growing teams.",
      features: [
        "Unlimited Invoices",
        "Advanced Analytics",
        "Bulk PDF Operations",
        "Team Collaboration",
        "White-label Reports",
        "24/7 Dedicated Support"
      ],
      icon: <Crown size={24} color="#a855f7" />,
      color: "#a855f7",
      btnText: "Unlock Everything"
    }
  ];

  return (
    <div 
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(12px, 4vw, 40px)",
        background: "rgba(0, 0, 0, 0.9)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        animation: "fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        overflowY: "auto"
      }}
      onClick={onClose}
    >
      <div 
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "1000px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-primary)",
          borderRadius: "32px",
          boxShadow: "0 40px 100px -20px rgba(0, 0, 0, 0.6)",
          display: "flex",
          flexDirection: "column",
          margin: "auto" // Critical for centering in overflow scroll
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Bar */}
        <div style={{ height: "6px", background: "linear-gradient(90deg, #f5c842, #a855f7, #3b82f6)", borderTopLeftRadius: "32px", borderTopRightRadius: "32px" }} />
        
        {/* Header Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 32px 0 32px" }}>
          <button 
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--border-primary)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              transition: "all 0.2s"
            }}
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <button 
            onClick={onClose}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.05)",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s"
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "32px 40px 48px 40px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h2 style={{ fontSize: "clamp(24px, 5vw, 42px)", fontWeight: "900", color: "var(--text-primary)", marginBottom: "12px", letterSpacing: "-1.5px" }}>
              Elevate your <span style={{ 
                background: "linear-gradient(135deg, var(--accent-primary), #a855f7)", 
                WebkitBackgroundClip: "text", 
                WebkitTextFillColor: "transparent" 
              }}>Billing Experience</span>
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "16px", maxWidth: "600px", margin: "0 auto", lineHeight: "1.6" }}>
              Unlock cloud sync, unlimited invoices, and professional branding with our premium tiers.
            </p>
          </div>

          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
            gap: "24px" 
          }}>
            {plans.map((p) => {
              const active = currentPlan === p.id;
              
              return (
                <div 
                  key={p.id}
                  style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    padding: "32px",
                    borderRadius: "28px",
                    background: p.popular ? "rgba(245, 200, 66, 0.04)" : "rgba(255, 255, 255, 0.02)",
                    border: p.popular ? "2px solid var(--accent-primary)" : "1px solid var(--border-primary)",
                    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                    transform: p.popular ? "scale(1.02)" : "scale(1)",
                    boxShadow: p.popular ? "0 30px 40px -10px rgba(245, 200, 66, 0.08)" : "none"
                  }}
                >
                  {p.popular && (
                    <div style={{
                      position: "absolute",
                      top: "-14px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      padding: "6px 18px",
                      background: "var(--accent-primary)",
                      color: "#000",
                      fontSize: "11px",
                      fontWeight: "900",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      borderRadius: "50px",
                      boxShadow: "0 8px 20px rgba(245, 200, 66, 0.4)"
                    }}>
                      Recommended
                    </div>
                  )}

                  <div style={{ marginBottom: "28px" }}>
                    <div style={{ 
                      width: "56px", 
                      height: "56px", 
                      borderRadius: "18px", 
                      background: "rgba(255, 255, 255, 0.05)", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      marginBottom: "20px"
                    }}>
                      {p.icon}
                    </div>
                    <h3 style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "8px" }}>{p.name}</h3>
                    <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "24px", lineHeight: "1.5" }}>
                      {p.description}
                    </p>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                      <span style={{ fontSize: "38px", fontWeight: "900", color: "var(--text-primary)" }}>{currency.symbol}{p.price}</span>
                      {p.period && <span style={{ color: "var(--text-muted)", fontSize: "15px" }}>{p.period}</span>}
                    </div>
                  </div>

                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "14px", marginBottom: "36px" }}>
                    {p.features.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "start", gap: "12px" }}>
                        <div style={{ 
                          marginTop: "2px", 
                          flexShrink: 0, 
                          width: "20px", 
                          height: "20px", 
                          borderRadius: "50%", 
                          background: "rgba(34, 197, 94, 0.15)", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center" 
                        }}>
                          <Check size={12} color="#22c55e" />
                        </div>
                        <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{f}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      if (!active && p.id !== 'free') {
                        onUpgrade(p.id);
                      }
                    }}
                    disabled={active}
                    style={{
                      width: "100%",
                      padding: "18px",
                      borderRadius: "16px",
                      fontWeight: "800",
                      fontSize: "15px",
                      cursor: active ? "default" : "pointer",
                      background: active ? "rgba(255, 255, 255, 0.1)" : (p.popular ? "var(--accent-primary)" : "var(--bg-primary)"),
                      color: active ? "var(--text-muted)" : (p.popular ? "#000" : "var(--text-primary)"),
                      border: p.popular ? "none" : "1px solid var(--border-primary)",
                      boxShadow: (!active && p.popular) ? "0 10px 20px -5px rgba(245, 200, 66, 0.3)" : "none",
                      transition: "all 0.2s"
                    }}
                  >
                    {active ? "Currently Subscribed" : p.btnText}
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ 
            marginTop: "48px", 
            padding: "24px", 
            background: "rgba(255, 255, 255, 0.02)", 
            borderRadius: "20px",
            border: "1px dashed var(--border-primary)",
            textAlign: "center"
          }}>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "8px" }}>
              Need a custom tailored solution for your enterprise?
            </p>
            <a href="mailto:applicationmanifester@gmail.com" style={{ 
              color: "var(--accent-primary)", 
              textDecoration: "none", 
              fontWeight: "700",
              fontSize: "14px"
            }}>
              Contact our sales department →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
