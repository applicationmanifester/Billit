import React, { useState } from "react";

const TEMPLATES = [
    {
        id: "resignation_acceptance",
        name: "Resignation Acceptance",
        subject: "Acceptance of Resignation",
        content: `I am writing to formally acknowledge and accept your resignation from your position as [Employee Job Title] at [Company Name], effective [Last Working Date].

We would like to take this opportunity to thank you for your contributions during your time with us. Your dedication to [specific project or area of strength] has been greatly appreciated, and you will be missed by the team.

To ensure a smooth transition, we would appreciate your assistance in handing over your current responsibilities and projects to [Name of Successor] by [Transition Completion Date]. Please also ensure that all company property, including [list items like laptop, keys, ID badges], is returned to the HR department on or before your final day.

Regarding your final compensation, including any accrued leave and benefits, our HR department will provide you with a detailed breakdown and coordinate the final settlement.

We wish you the very best in your next chapter and for all your future professional and personal endeavors. Please do not hesitate to contact us at [contact information] if we can provide any further assistance during this period.`
    },
    {
        id: "experience_certificate",
        name: "Experience Certificate",
        subject: "Experience Certificate",
        content: `This is to certify that [Employee Name] was employed with [Company Name] from [Start Date] to [End Date] as a [Job Title].

During [his/her] tenure, we found [him/her] to be diligent, hardworking, and a valuable asset to the organization. [He/She] has consistently demonstrated strong professional skills and technical competence in [Specific Domain].

[He/She] leaves us on [his/her] own accord to pursue better career prospects. We wish [him/her] success in all [his/her] future endeavors.`
    }
];

export const TemplateManager = ({ clients, seller, getLetterPDF, showToast }) => {
    const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
    const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || "");
    const [content, setContent] = useState(TEMPLATES[0].content);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!selectedClientId) return showToast("Please select a recipient!", "error");
        setIsGenerating(true);
        try {
            const client = clients.find(c => String(c.id) === String(selectedClientId));
            // Fill placeholders
            let filledContent = content
                .replace(/\[Company Name\]/g, seller.name || "Our Company")
                .replace(/\[Employee Name\]/g, client.name || "Employee")
                .replace(/\[Recipient Name\]/g, client.name || "Recipient");

            const pdf = await getLetterPDF(filledContent, client, seller, selectedTemplate.subject);
            const link = document.createElement("a");
            link.href = pdf.url;
            link.download = `${selectedTemplate.name.replace(/\s+/g, "_")}_${client.name.replace(/\s+/g, "_")}.pdf`;
            link.click();
            showToast("Letter generated successfully!");
        } catch (e) {
            console.error(e);
            showToast("Failed to generate letter", "error");
        }
        setIsGenerating(false);
    };

    return (
        <div className="animate-slide-up" style={{ padding: "16px" }}>
            <div className="premium-card" style={{ padding: "20px", marginBottom: "20px" }}>
                <h3 style={{ margin: "0 0 16px" }}>Professional Document Templates</h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
                    Select a template and a recipient to generate a professional PDF document.
                </p>

                <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>Select Template</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {TEMPLATES.map(t => (
                            <button
                                key={t.id}
                                onClick={() => { setSelectedTemplate(t); setContent(t.content); }}
                                style={{
                                    padding: "10px 16px",
                                    borderRadius: "12px",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                    border: `1px solid ${selectedTemplate.id === t.id ? "var(--accent-primary)" : "var(--border-primary)"}`,
                                    background: selectedTemplate.id === t.id ? "var(--accent-primary)" : "var(--bg-card)",
                                    color: selectedTemplate.id === t.id ? "#000" : "var(--text-secondary)",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                            >
                                {t.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>Recipient / Client</div>
                    <select
                        className="input-field"
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        style={{ width: "100%", background: "var(--bg-input)", color: "var(--text-primary)" }}
                    >
                        <option value="">Select Recipient...</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: "24px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>Document Content</div>
                    <textarea
                        className="input-field"
                        style={{ height: "250px", resize: "none", fontSize: "13px", lineHeight: "1.5" }}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Customize the letter content here..."
                    />
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "6px" }}>
                        Tip: Placeholders like [Company Name], [Employee Name] will be filled automatically if available.
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="primary-btn"
                    style={{ width: "100%", padding: "16px", fontSize: "15px" }}
                >
                    {isGenerating ? "Generating PDF..." : "Generate Professional PDF"}
                </button>
            </div>
        </div>
    );
};
