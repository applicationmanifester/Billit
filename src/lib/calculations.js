export const total = (items) => (items || []).reduce((s, i) => s + (i?.qty || 0) * (i?.price || 0), 0);

export const getItemTaxList = (item, taxPool) => {
    const qty = item?.qty || 0;
    const price = item?.price || 0;
    const base = qty * price;

    // Use snapshot if available (for historical data preservation)
    if (item?.taxSnapshots && Array.isArray(item.taxSnapshots)) {
        return item.taxSnapshots.map(tr => ({
            label: tr.label,
            rate: tr.rate,
            amount: base * (tr.rate / 100)
        }));
    }

    const appliedTaxIds = (Array.isArray(item?.tax) ? item.tax : [1]).map(String);
    return taxPool.filter(tr => appliedTaxIds.includes(String(tr.id))).map(tr => ({
        label: tr.label,
        rate: tr.rate,
        amount: base * (tr.rate / 100)
    }));
};

export const itemTaxTotal = (item, taxPool) => getItemTaxList(item, taxPool).reduce((s, t) => s + t.amount, 0);

export const totalWithTax = (items, taxPool) => (items || []).reduce((s, i) => s + (i?.qty || 0) * (i?.price || 0) + itemTaxTotal(i, taxPool), 0);

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
