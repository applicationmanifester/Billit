import React, { useState } from "react";

export const Onboarding = ({ onComplete }) => {
    const [step, setStep] = useState(0);

    const steps = [
        {
            title: "Welcome to Billit",
            description: "The fastest, most professional way to manage your business on the go.",
            icon: "🚀",
            color: "#F5C842"
        },
        {
            title: "5-Second Invoicing",
            description: "Tap the floating '+' button anywhere to create invoices, clients, or items in seconds.",
            icon: "⚡",
            color: "#6366f1"
        },
        {
            title: "Professional Branding",
            description: "Every invoice you send is beautifully formatted and helps you grow your brand automatically.",
            icon: "✨",
            color: "#10b981"
        },
        {
            title: "Quick WhatsApp Share",
            description: "Send invoices directly to your clients' WhatsApp with professional pre-filled messages.",
            icon: "💬",
            color: "#25D366"
        }
    ];

    const currentStep = steps[step];

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            background: "var(--bg-primary)",
            zIndex: 5000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 24px",
            textAlign: "center"
        }}>
            <div style={{
                position: "absolute",
                top: "calc(20px + var(--safe-area-top))",
                right: "24px"
            }}>
                <button 
                    onClick={onComplete}
                    style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-secondary)",
                        fontSize: "14px",
                        fontWeight: "bold",
                        cursor: "pointer"
                    }}
                >
                    Skip
                </button>
            </div>

            <div key={step} className="animate-slide-up" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{
                    width: "100px",
                    height: "100px",
                    background: `${currentStep.color}22`,
                    borderRadius: "30px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "48px",
                    marginBottom: "32px",
                    border: `2px solid ${currentStep.color}44`
                }}>
                    {currentStep.icon}
                </div>

                <h1 style={{ fontSize: "28px", fontWeight: "900", marginBottom: "16px", color: "var(--text-primary)" }}>
                    {currentStep.title}
                </h1>
                
                <p style={{ fontSize: "16px", color: "var(--text-secondary)", lineHeight: "1.6", maxWidth: "300px", margin: "0 auto" }}>
                    {currentStep.description}
                </p>
            </div>

            <div style={{ width: "100%", maxWidth: "400px", marginBottom: "calc(20px + var(--safe-area-bottom))" }}>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "32px" }}>
                    {steps.map((_, i) => (
                        <div key={i} style={{
                            width: i === step ? "24px" : "8px",
                            height: "8px",
                            background: i === step ? "var(--accent-primary)" : "var(--border-primary)",
                            borderRadius: "4px",
                            transition: "all 0.3s ease"
                        }} />
                    ))}
                </div>

                <button 
                    onClick={() => {
                        if (step < steps.length - 1) setStep(step + 1);
                        else onComplete();
                    }}
                    className="primary-btn"
                    style={{ width: "100%", padding: "18px", fontSize: "16px", borderRadius: "16px" }}
                >
                    {step < steps.length - 1 ? "Next" : "Get Started"}
                </button>
            </div>
        </div>
    );
};
