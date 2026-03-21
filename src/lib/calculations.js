export const total = (items) => (items || []).reduce((s, i) => {
    const lineBase = (Number(i?.qty) || 0) * (Number(i?.price) || 0);
    return s + Math.round(lineBase * 100) / 100;
}, 0);

export const getItemTaxList = (item, taxPool) => {
    const qty = item?.qty || 0;
    const price = item?.price || 0;
    const base = qty * price;

    // Use snapshot if available (for historical data preservation)
    if (item?.taxSnapshots && Array.isArray(item.taxSnapshots)) {
        return item.taxSnapshots.map(tr => ({
            label: tr.label,
            rate: tr.rate,
            amount: Math.round(base * (tr.rate / 100) * 100) / 100
        }));
    }

    const appliedTaxIds = (Array.isArray(item?.tax) ? item.tax : []).map(String);
    return taxPool.filter(tr => appliedTaxIds.includes(String(tr.id))).map(tr => {
        const amount = base * (tr.rate / 100);
        return {
            label: tr.label,
            rate: tr.rate,
            amount: Math.round(amount * 100) / 100
        };
    });
};

export const itemTaxTotal = (item, taxPool) => {
    const total = getItemTaxList(item, taxPool).reduce((s, t) => s + t.amount, 0);
    return Math.round(total * 100) / 100;
};

export const totalWithTax = (items, taxPool) => {
    const totalVal = (items || []).reduce((s, i) => {
        const itemBase = (Number(i?.qty) || 0) * (Number(i?.price) || 0);
        const itemTax = itemTaxTotal(i, taxPool);
        // Round the item's total (base + tax) to ensure sums are consistent
        return s + Math.round((itemBase + itemTax) * 100) / 100;
    }, 0);
    return Math.round(totalVal * 100) / 100;
};

export const formatCurrency = (n, currency) => {
    try {
        return new Intl.NumberFormat(currency?.locale || "en-US", {
            style: "currency",
            currency: currency?.code || "USD"
        }).format(n || 0);
    } catch (e) {
        return (currency?.symbol || "$") + (n || 0).toFixed(2);
    }
};

export const calculateBaseFromTotal = (total, taxPool, appliedTaxIds) => {
    const ids = (Array.isArray(appliedTaxIds) ? appliedTaxIds : []).map(String);
    const totalRate = taxPool
        .filter(tr => ids.includes(String(tr.id)))
        .reduce((sum, tr) => sum + (Number(tr.rate) || 0), 0);

    // Keep high precision for base calculation to minimize rounding errors in sum
    return total / (1 + (totalRate / 100));
};
