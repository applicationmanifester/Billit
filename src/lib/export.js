import { downloadFile } from "./native_actions";

/**
 * Converts an array of objects to a CSV string.
 * @param {Array<Object>} data 
 * @param {Array<string>} headers 
 */
export const convertToCSV = (data, headers) => {
    if (!data || !data.length) return "";

    const headerRow = headers.join(",");
    const rows = data.map(obj => {
        return headers.map(header => {
            let val = obj[header] === undefined || obj[header] === null ? "" : obj[header];
            // Escape double quotes and wrap in quotes if contains comma
            val = String(val).replace(/"/g, '""');
            if (val.includes(",") || val.includes("\n") || val.includes('"')) {
                val = `"${val}"`;
            }
            return val;
        }).join(",");
    });

    return [headerRow, ...rows].join("\n");
};

/**
 * Triggers a browser download of a CSV file.
 * @param {string} csvContent 
 * @param {string} fileName 
 */
export const downloadCSV = (csvContent, fileName) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    downloadFile(blob, fileName, "text/csv");
};

/**
 * Specifically format invoices for CSV export.
 */
export const exportInvoicesToCSV = (invoices, getClient, taxRates) => {
    const headers = ["ID", "Client", "Date", "Due Date", "Status", "Total Amount"];
    const data = invoices.map(inv => ({
        ID: inv.id,
        Client: getClient(inv.clientId)?.name || "Unknown",
        Date: inv.date,
        "Due Date": inv.due,
        Status: inv.status,
        "Total Amount": inv.totalAmount
    }));

    const csv = convertToCSV(data, headers);
    downloadCSV(csv, `Invoices-Export-${new Date().toISOString().split('T')[0]}.csv`);
};

/**
 * Specifically format clients for CSV export.
 */
export const exportClientsToCSV = (clients) => {
    const headers = ["Name", "Email", "Phone", "Address"];
    const data = clients.map(c => ({
        Name: c.name,
        Email: c.email,
        Phone: c.phone,
        Address: c.address
    }));

    const csv = convertToCSV(data, headers);
    downloadCSV(csv, `Clients-Export-${new Date().toISOString().split('T')[0]}.csv`);
};

/**
 * Specifically format products for CSV export.
 */
export const exportProductsToCSV = (products) => {
    const headers = ["Name", "Price", "Default"];
    const data = products.map(p => ({
        Name: p.name,
        Price: p.price,
        Default: p.isDefault ? "Yes" : "No"
    }));

    const csv = convertToCSV(data, headers);
    downloadCSV(csv, `Inventory-Export-${new Date().toISOString().split('T')[0]}.csv`);
};

/**
 * Generates a SHA-256 signature for the given data.
 */
const generateSignature = async (data) => {
    const salt = "billit-secure-v1-2024"; // Internal salt for integrity
    const msgUint8 = new TextEncoder().encode(JSON.stringify(data) + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Exports all application data as a single JSON file with integrity check.
 * @param {Object} data 
 */
export const exportFullDataJSON = async (data) => {
    // Clone and prepare data
    const exportData = { ...data };
    delete exportData._signature; // Remove old signature if present
    
    // Generate signature
    const signature = await generateSignature(exportData);
    exportData._signature = signature;

    const jsonString = JSON.stringify(exportData, null, 2);
    // Base64 encode for obfuscation (locking)
    const encodedData = btoa(unescape(encodeURIComponent(jsonString)));
    
    const blob = new Blob([encodedData], { type: "application/octet-stream" });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await downloadFile(blob, `Billit-Backup-${timestamp}.billit`, "application/octet-stream");
};

/**
 * Imports application data from a JSON file with integrity check.
 * @param {File} file 
 * @param {Object} setters 
 * @param {Function} showToast 
 */
export const importFullDataJSON = async (file, setters, showToast) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            let content = e.target.result;
            let data;

            // Try decoding Base64 first
            try {
                const decoded = decodeURIComponent(escape(atob(content)));
                data = JSON.parse(decoded);
            } catch (err) {
                // If Base64 fails, try raw JSON (legacy support)
                data = JSON.parse(content);
            }
            
            // Signature Verification
            if (data._signature) {
                const receivedSignature = data._signature;
                const checkData = { ...data };
                delete checkData._signature;
                const expectedSignature = await generateSignature(checkData);

                if (receivedSignature !== expectedSignature) {
                    throw new Error("SECURITY ALERT: This backup file has been tampered with or is corrupted. Restore blocked for your safety.");
                }
            } else {
                console.warn("Importing legacy backup without signature.");
                // For legacy files, we still check basic structure
            }
            
            // Basic validation
            if (!data.invoices && !data.clients && !data.products && !data.seller) {
                throw new Error("Invalid backup file format.");
            }

            // Apply data using setters
            if (data.invoices) setters.setInvoices(data.invoices);
            if (data.clients) setters.setClients(data.clients);
            if (data.products) setters.setProducts(data.products);
            if (data.seller) setters.setSeller(data.seller);
            if (data.taxRates) setters.setTaxRates(data.taxRates);
            if (data.currency) setters.setCurrency(data.currency);
            if (data.inventoryTitle) setters.setInventoryTitle(data.inventoryTitle);
            if (data.defaultNote) setters.setDefaultNote(data.defaultNote);
            if (data.theme) setters.setTheme(data.theme);
            if (data.hapticsEnabled !== undefined) setters.setHapticsEnabled(data.hapticsEnabled);
            if (data.soundEnabled !== undefined) setters.setSoundEnabled(data.soundEnabled);
            if (data.defaultClientId) setters.setDefaultClientId(data.defaultClientId);

            showToast("Backup restored successfully!", "success");
        } catch (error) {
            console.error("Import Error:", error);
            showToast(`${error.message}`, "error");
        }
    };
    reader.readAsText(file);
};
