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
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
 * Exports all application data as a single JSON file.
 * @param {Object} data 
 */
export const exportFullDataJSON = (data) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Billit-Full-Backup-${timestamp}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Imports application data from a JSON file.
 * @param {File} file 
 * @param {Object} setters 
 * @param {Function} showToast 
 */
export const importFullDataJSON = (file, setters, showToast) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            // Basic validation: check if key fields exist
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

            showToast("Backup restored successfully!", "success");
        } catch (error) {
            console.error("Import Error:", error);
            showToast(`Failed to restore backup: ${error.message}`, "error");
        }
    };
    reader.readAsText(file);
};
