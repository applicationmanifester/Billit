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
