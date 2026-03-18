import React from "react";

export const SearchBar = ({ search, setSearch, placeholder = "Search..." }) => {
    return (
        <div style={{ position: "relative", marginBottom: "20px", display: "flex", alignItems: "center" }}>
            <div style={{ position: "relative", width: "100%" }}>
                <span style={{ 
                    position: "absolute", 
                    left: "14px", 
                    top: "50%", 
                    transform: "translateY(-50%)", 
                    fontSize: "14px",
                    opacity: 0.6,
                    color: "var(--text-secondary)"
                }}>🔍</span>
                <input 
                    type="text" 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    placeholder={placeholder}
                    className="input-field"
                    style={{
                        width: "100%", 
                        padding: "12px 36px 12px 40px", 
                        borderRadius: "14px",
                        background: "var(--bg-card)", 
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-primary)", 
                        outline: "none",
                        boxSizing: "border-box",
                        fontSize: "14px",
                        fontWeight: "500",
                        transition: "all 0.2s ease"
                    }}
                />
                {search && (
                    <button 
                        onClick={() => setSearch("")}
                        style={{ 
                            position: "absolute", 
                            right: "12px", 
                            top: "50%", 
                            transform: "translateY(-50%)", 
                            background: "rgba(255,255,255,0.05)", 
                            border: "none", 
                            borderRadius: "50%",
                            width: "20px", 
                            height: "20px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer", 
                            fontSize: "10px",
                            color: "var(--text-secondary)"
                        }}
                    >✕</button>
                )}
            </div>
        </div>
    );
};
