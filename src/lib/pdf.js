import { total, getItemTaxList, itemTaxTotal, totalWithTax, formatCurrency } from "./calculations";
import { getProductImage } from "./db";

const hexMap = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0').toUpperCase());

// Cache for expensive image operations
const imgCache = {
    currency: {},
    biz: {},
    qr: {}
};

const getQRImage = (dataUrl) => {
    if (!dataUrl) return Promise.resolve(null);
    if (imgCache.qr[dataUrl]) return Promise.resolve(imgCache.qr[dataUrl]);

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxDim = 600;
            let w = img.width, h = img.height;
            if (w > maxDim || h > maxDim) {
                const s = maxDim / Math.max(w, h);
                w *= s; h *= s;
            }
            canvas.width = Math.floor(w); canvas.height = Math.floor(h);
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            const parts = new Array(data.length / 4 * 3);
            const len = data.length;
            for (let i = 0, k = 0; i < len; i += 4) {
                parts[k++] = hexMap[data[i]];
                parts[k++] = hexMap[data[i + 1]];
                parts[k++] = hexMap[data[i + 2]];
            }
            const result = { hex: parts.join('') + ">", w: canvas.width, h: canvas.height };
            imgCache.qr[dataUrl] = result;
            resolve(result);
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
    });
};

const getCurrencySymbolImage = (symbol, bgColor = "white") => {
    const cacheKey = `${symbol}_${bgColor}`;
    if (imgCache.currency[cacheKey]) return Promise.resolve(imgCache.currency[cacheKey]);

    return new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        const size = 128; // Higher res for better quality
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = bgColor; ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = "black";
        // Better font stack for local currency symbols
        ctx.font = `bold ${size * 0.75}px "Noto Sans", "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(symbol, size / 2, size / 2 + size * 0.05);

        const data = ctx.getImageData(0, 0, size, size).data;
        const parts = new Array(data.length / 4 * 3);
        const len = data.length;
        for (let i = 0, k = 0; i < len; i += 4) {
            parts[k++] = hexMap[data[i]];
            parts[k++] = hexMap[data[i + 1]];
            parts[k++] = hexMap[data[i + 2]];
        }
        const result = { hex: parts.join('') + ">", w: size, h: size };
        imgCache.currency[cacheKey] = result;
        resolve(result);
    });
};

export const getInventoryPDFData = async (seller, currency, products, taxRates, title = "INVENTORY LIST") => {
    const biz = seller?.name || "BILLIT";
    const isBizAscii = /^[\x00-\x7F]*$/.test(biz);
    

    const W = 595, H = 842, M = 40;
    const esc = (s) => String(s || "").replace(/[()\\]/g, (c) => "\\" + c);

    const curSymbol = currency?.symbol || "$";
    const isAscii = /^[\x00-\x7F]*$/.test(curSymbol);
    const pdfCur = isAscii ? curSymbol : (currency?.code || "INR");
    const curImgData = !isAscii ? await getCurrencySymbolImage(curSymbol) : null;

    let objCount = 0; const objects = [];
    const addObj = (content) => {
        const data = typeof content === "string" ? new TextEncoder().encode(content) : content;
        objects.push({ num: ++objCount, data });
        return objCount;
    };

    const catID = addObj("<< /Type /Catalog /Pages 2 0 R >>");
    const pagesID = addObj(""); // Placeholder for Pages
    const f1ID = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const f2ID = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    const qrData = seller.qrCode ? await getQRImage(seller.qrCode) : null;
    const logoData = seller.logo ? await getQRImage(seller.logo) : null;

    const prodImages = await Promise.all(products.map(async p => {
        if (p.image) {
            let imgData = p.image;
            if (imgData === true) {
                imgData = await getProductImage(p.id);
            }
            if (imgData) {
                const data = await getQRImage(imgData);
                return { id: p.id, data };
            }
        }
        return { id: p.id, data: null };
    }));

    let lns = [];
    const txt = (t, x, y, f, s) => { lns.push("BT", `/${f} ${s} Tf`, `${(Number(x) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} Td`, `(${esc(t)}) Tj`, "ET"); };
    const rc = (x, y, w, h) => lns.push(`${(Number(x) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} ${(Number(w) || 0).toFixed(2)} ${(Number(h) || 0).toFixed(2)} re`);
    const fl = () => lns.push("f"); const rg = (r, g, b) => lns.push(`${(Number(r) || 0).toFixed(3)} ${(Number(g) || 0).toFixed(3)} ${(Number(b) || 0).toFixed(3)} rg`);

    const xObjMap = {};
    if (logoData && logoData.hex) {
        const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${logoData.w} /Height ${logoData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${logoData.hex.length} >>\nstream\n${logoData.hex}\nendstream`);
        xObjMap["ImLogo"] = id;
    }
    if (qrData && qrData.hex) {
        const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${qrData.w} /Height ${qrData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${qrData.hex.length} >>\nstream\n${qrData.hex}\nendstream`);
        xObjMap["ImQR"] = id;
    }
    if (curImgData && curImgData.hex) {
        const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${curImgData.w} /Height ${curImgData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${curImgData.hex.length} >>\nstream\n${curImgData.hex}\nendstream`);
        xObjMap["ImCur"] = id;
    }

    rg(0.059, 0.059, 0.098); rc(0, H - 120, W, 120); fl();

    const bizWidth = biz.length * 24 * 0.55;
    if (isBizAscii) {
        rg(0.961, 0.784, 0.259); txt(biz.toUpperCase(), W / 2 - (bizWidth / 2), H - 55, "F2", 24);
    } else {
        const bizImg = await getBizImage(biz);
        const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${bizImg.w} /Height ${bizImg.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${bizImg.hex.length} >>\nstream\n${bizImg.hex}\nendstream`);
        xObjMap["ImBiz"] = id;
        const drawW = 250; const drawH = 25;
        lns.push(`q ${drawW} 0 0 ${drawH} ${W/2 - drawW/2} ${H - 65} cm /ImBiz Do Q`);
    }

    // Centered Inventory Title
    const displayTitle = (title || "INVENTORY LIST").toUpperCase();
    const titleWidth = displayTitle.length * 14 * 0.5;
    rg(0.62, 0.604, 0.678); txt(displayTitle, W / 2 - (titleWidth / 2), H - 85, "F1", 14);

    if (logoData) {
        const imgSize = 30;
        lns.push(`q ${imgSize} 0 0 ${imgSize} ${M} ${H - 65} cm /ImLogo Do Q`);
    }

    let cy = H - 180;
    rg(0.95, 0.95, 0.95); rc(M, cy - 5, W - M * 2, 20); fl();
    rg(0.2, 0.2, 0.2); txt("ITEM NAME", M + 5, cy, "F2", 9); txt("TOTAL PRICE (INCL. TAX)", W - M - 140, cy, "F2", 9);
    cy -= 30;

    // Sort products: images first
    const sortedProducts = [...products].sort((a, b) => {
        const aHasImg = a.image ? 1 : 0;
        const bHasImg = b.image ? 1 : 0;
        return bHasImg - aHasImg;
    });

    for (let i = 0; i < sortedProducts.length; i++) {
        const p = sortedProducts[i];
        const pImg = prodImages.find(img => img.id === p.id);
        const hasImg = pImg && pImg.data && pImg.data.hex;
        const nameX = M + 40; // All names in one column

        // Calculations moved back into loop to fix ReferenceError
        const taxes = p.tax || (taxRates || []).map(t => t.id);
        const taxAmt = itemTaxTotal({ ...p, qty: 1, tax: taxes }, taxRates);
        const totalPrice = Number(p.price || 0) + taxAmt;

        rg(0.3, 0.3, 0.3); txt(p.name || "", nameX, cy, "F1", 11);
        let lineCount = 0;
        if (p.desc) {
            rg(0.5, 0.5, 0.5);
            const desc = p.desc || "";
            const maxChars = 55;
            const words = desc.split(" ");
            let currentLine = "";

            for (const word of words) {
                if ((currentLine + word).length > maxChars) {
                    txt(currentLine.trim(), nameX, cy - 10 - (lineCount * 9), "F1", 8);
                    currentLine = word + " ";
                    lineCount++;
                } else {
                    currentLine += word + " ";
                }
            }
            if (currentLine) {
                txt(currentLine.trim(), nameX, cy - 10 - (lineCount * 9), "F1", 8);
                lineCount++;
            }
            cy -= (lineCount * 9);
        }

        if (hasImg) {
            const imgName = `ImP${i}`;
            const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${pImg.data.w} /Height ${pImg.data.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${pImg.data.hex.length} >>\nstream\n${pImg.data.hex}\nendstream`);
            xObjMap[imgName] = id;
            const imgSize = 25;
            // Place image to the left, keeping text alignment consistent
            lns.push(`q ${imgSize} 0 0 ${imgSize} ${M + 5} ${cy + (p.desc ? (lineCount * 9) : 0) - 12} cm /${imgName} Do Q`);
        }

        if (curImgData) {
            const curSize = 11;
            lns.push(`q ${curSize} 0 0 ${curSize} ${W - M - 142} ${cy + (p.desc ? (lineCount * 9) : 0) - 1} cm /ImCur Do Q`);
            txt((Number(totalPrice) || 0).toFixed(2), W - M - 130, cy + (p.desc ? (lineCount * 9) : 0), "F2", 11);
        } else {
            txt(`${pdfCur} ${(Number(totalPrice) || 0).toFixed(2)}`, W - M - 140, cy + (p.desc ? (lineCount * 9) : 0), "F2", 11);
        }
        cy -= 45;
        if (cy < M + 140) break; // Reserve enough space for QR code at bottom
    }

    if (qrData) {
        // ALWAYS display QR code below the items
        const qrSize = 100;
        const qrY = Math.max(cy - qrSize - 20, M + 10);
        rg(0.95, 0.95, 0.95); rc(M, qrY, qrSize + 10, qrSize + 10); fl();
        lns.push(`q ${qrSize} 0 0 ${qrSize} ${M + 5} ${qrY + 5} cm /ImQR Do Q`);
        rg(0.4, 0.4, 0.4);
        txt("PAYMENT QR", M + qrSize + 20, qrY + 65, "F2", 12);
        txt("SCAN TO PAY", M + qrSize + 20, qrY + 45, "F1", 10);
    }

    // Branding
    rg(0.6, 0.6, 0.6);
    const brandingText = "Generated by Billit";
    const brandingWidth = brandingText.length * 8 * 0.5;
    txt(brandingText, W - M - brandingWidth, M - 15, "F1", 8);

    const stream = lns.join("\n");
    const ctID = addObj(`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`);
    const xObjRes = Object.entries(xObjMap).map(([name, id]) => `/${name} ${id} 0 R`).join(" ");
    const pgID = addObj(`<< /Type /Page /Parent ${pagesID} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${ctID} 0 R /Resources << /Font << /F1 ${f1ID} 0 R /F2 ${f2ID} 0 R >> ${xObjRes ? `/XObject << ${xObjRes} >>` : ""} >> >>`);

    objects[1].data = new TextEncoder().encode(`<< /Type /Pages /Kids [${pgID} 0 R] /Count 1 >>`);

    let pdf = "%PDF-1.1\n";
    const xrefs = [];
    objects.forEach(o => { xrefs.push(pdf.length); pdf += `${o.num} 0 obj\n${new TextDecoder("utf-8").decode(o.data)}\nendobj\n`; });
    const startXref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    xrefs.forEach(x => { pdf += `${String(x).padStart(10, "0")} 00000 n \n`; });
    pdf += `trailer << /Size ${objects.length + 1} /Root ${catID} 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
    return new TextEncoder().encode(pdf);
};

export const getInvoicePageStream = async (inv, client, seller, currency, taxRates) => {
    const biz = seller?.name || "BILLIT";
    const isBizAscii = /^[\x00-\x7F]*$/.test(biz);
    

    const W = 595, H = 842, M = 40;
    const esc = (s) => String(s || "").replace(/[()\\]/g, (c) => "\\" + c);
    let lns = [];
    const move = (x, y) => lns.push(`${x.toFixed(2)} ${y.toFixed(2)} m`);
    const lto = (x, y) => lns.push(`${x.toFixed(2)} ${y.toFixed(2)} l`);
    const txt = (t, x, y, f, s) => { lns.push("BT", `/${f} ${s} Tf`, `${(Number(x) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} Td`, `(${esc(t)}) Tj`, "ET"); };
    const rc = (x, y, w, h) => lns.push(`${(Number(x) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} ${(Number(w) || 0).toFixed(2)} ${(Number(h) || 0).toFixed(2)} re`);
    const fl = () => lns.push("f"); const rg = (r, g, b) => lns.push(`${(Number(r) || 0).toFixed(3)} ${(Number(g) || 0).toFixed(3)} ${(Number(b) || 0).toFixed(3)} rg`);

    const qrData = seller.qrCode ? await getQRImage(seller.qrCode) : null;
    const logoData = seller.logo ? await getQRImage(seller.logo) : null;

    rg(0.059, 0.059, 0.098); rc(0, H - 160, W, 160); fl();

    let xOffset = M;
    if (logoData) {
        const imgSize = 50;
        lns.push(`q ${imgSize} 0 0 ${imgSize} ${M} ${H - 85} cm /ImLogo Do Q`);
        xOffset += 65;
    }

    if (isBizAscii) {
        rg(0.961, 0.784, 0.259); txt(biz.toUpperCase(), xOffset, H - 65, "F2", 24);
    } else {
        const bizImg = await getBizImage(biz);
        const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${bizImg.w} /Height ${bizImg.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${bizImg.hex.length} >>\nstream\n${bizImg.hex}\nendstream`);
        xObjMap["ImBiz"] = id;
        const drawW = 280; const drawH = 28;
        lns.push(`q ${drawW} 0 0 ${drawH} ${xOffset} ${H - 75} cm /ImBiz Do Q`);
    }
    rg(0.8, 0.8, 0.8); txt(seller?.tagline || "", xOffset, H - 82, "F1", 10);
    rg(1, 1, 1);
    txt(`Email: ${seller?.email || ""}`, xOffset, H - 105, "F1", 9);
    txt(`Phone: ${seller?.phone || ""}`, xOffset, H - 116, "F1", 9);
    txt(`Address: ${seller?.address || ""}`, xOffset, H - 127, "F1", 9);
    if (seller?.gstin) txt(`Tax ID: ${seller.gstin}`, xOffset, H - 138, "F1", 9);

    rg(1, 1, 1); txt("INVOICE", W - M - 140, H - 65, "F2", 24);
    txt(`No: ${inv.id}`, W - M - 140, H - 85, "F2", 12);
    txt(`Date: ${inv.date}`, W - M - 140, H - 100, "F1", 9);
    if (inv.time) txt(`Time: ${inv.time}`, W - M - 140, H - 111, "F1", 9);
    txt(`Due: ${inv.due || inv.date}`, W - M - 140, H - 122, "F1", 9);

    rg(0, 0, 0); txt("BILL TO", M, H - 185, "F2", 11);
    rg(0.2, 0.2, 0.2); txt(client?.name || "Customer", M, H - 203, "F2", 14);
    rg(0.4, 0.4, 0.4);
    txt(client?.email || "", M, H - 217, "F1", 10);
    txt(client?.phone || "", M, H - 228, "F1", 10);
    txt(client?.address || "", M, H - 239, "F1", 10);

    let cy = H - 280;
    rg(0.95, 0.95, 0.95); rc(M, cy - 10, W - M * 2, 30); fl();
    rg(0.1, 0.1, 0.1);
    txt("DESCRIPTION", M + 10, cy + 5, "F2", 9);
    txt("QTY", M + 230, cy + 5, "F2", 9);
    txt("PRICE", M + 280, cy + 5, "F2", 9);
    txt("TAX %", M + 340, cy + 5, "F2", 9);
    txt("TAX AMT", M + 400, cy + 5, "F2", 9);
    txt("TOTAL", W - M - 70, cy + 5, "F2", 9);

    const curSymbol = currency?.symbol || "$";
    const isAscii = /^[\x00-\x7F]*$/.test(curSymbol);
    const pdfCur = isAscii ? curSymbol : (currency?.code || "INR");
    const curImgData = !isAscii ? await getCurrencySymbolImage(curSymbol) : null;
    const curImgYellowData = !isAscii ? await getCurrencySymbolImage(curSymbol, "#F5C842") : null;

    cy -= 50;
    const fmt = (n) => `${pdfCur} ${(Number(n) || 0).toFixed(2)}`;
    (inv?.items || []).forEach(it => {
        const lineCost = (it.qty || 0) * (it.price || 0);
        const taxList = getItemTaxList(it, taxRates);
        const totalTaxRate = taxList.reduce((sum, t) => sum + t.rate, 0);
        const taxAmount = itemTaxTotal(it, taxRates);
        const drawCellTxt = (t, x, width) => {
            if (t.includes(pdfCur) && curImgData) {
                const parts = t.split(pdfCur);
                const curSize = 12;
                lns.push(`q ${curSize} 0 0 ${curSize} ${x - 2} ${cy - 3} cm /ImCur Do Q`);
                txt(parts[1], x + 11, cy, "F2", 12);
            } else {
                txt(t, x, cy, "F2", 12);
            }
        };

        rg(0.3, 0.3, 0.3);
        txt(it.desc || "", M + 10, cy, "F1", 10);
        txt(String(it.qty || 0), M + 235, cy, "F1", 10);

        const drawPrice = (val, x) => {
            if (curImgData) {
                const curSize = 10;
                lns.push(`q ${curSize} 0 0 ${curSize} ${x - 2} ${cy - 2} cm /ImCur Do Q`);
                txt((Number(val) || 0).toFixed(2), x + 9, cy, "F1", 10);
            } else {
                txt(fmt(val), x, cy, "F1", 10);
            }
        };

        drawPrice(it.price || 0, M + 280);
        txt(`${totalTaxRate}%`, M + 345, cy, "F1", 10);
        drawPrice(taxAmount, M + 400);

        rg(0, 0, 0);
        if (curImgData) {
            const curSize = 10;
            lns.push(`q ${curSize} 0 0 ${curSize} ${W - M - 72} ${cy - 2} cm /ImCur Do Q`);
            txt((Number(lineCost + taxAmount) || 0).toFixed(2), W - M - 62, cy, "F2", 10);
        } else {
            txt(fmt(lineCost + taxAmount), W - M - 70, cy, "F2", 10);
        }
        rg(0.9, 0.9, 0.9); move(M, cy - 8); lto(W - M, cy - 8); lns.push("s");
        cy -= 28;
    });

    cy -= 40;
    const subtotal = total(inv?.items);
    const taxGrandTotal = (inv?.items || []).reduce((s, it) => s + itemTaxTotal(it, taxRates), 0);
    const grandTotal = totalWithTax(inv?.items, taxRates);

    const drawTotalLine = (label, val, y, isBold = false) => {
        rg(0.4, 0.4, 0.4); txt(label, W - M - 180, y, isBold ? "F2" : "F1", 11);
        rg(0, 0, 0);
        if (curImgData) {
            const curSize = 11;
            lns.push(`q ${curSize} 0 0 ${curSize} ${W - M - 72} ${y - 2} cm /ImCur Do Q`);
            txt(val.split(pdfCur)[1], W - M - 60, y, isBold ? "F2" : "F1", 11);
        } else {
            txt(val, W - M - 70, y, isBold ? "F2" : "F1", 11);
        }
    };

    drawTotalLine("Subtotal", fmt(subtotal), cy); cy -= 20;

    const taxBreakdown = {};
    (inv?.items || []).forEach(it => {
        getItemTaxList(it, taxRates).forEach(t => {
            const key = `${t.label} (${t.rate}%)`;
            taxBreakdown[key] = (taxBreakdown[key] || 0) + t.amount;
        });
    });

    Object.entries(taxBreakdown).forEach(([label, amount]) => {
        rg(0.5, 0.5, 0.5);
        txt(label, W - M - 180, cy, "F1", 9);
        txt(fmt(amount), W - M - 70, cy, "F1", 9);
        cy -= 16;
    });

    rg(0, 0, 0);
    drawTotalLine("Tax Total", fmt(taxGrandTotal), cy); cy -= 45; 
    const boxW = 250;
    rg(0.961, 0.784, 0.259); rc(W - M - boxW, cy - 10, boxW, 40); fl();
    rg(0, 0, 0); txt("TOTAL AMOUNT", W - M - boxW + 15, cy + 8, "F2", 13);
    if (curImgYellowData) {
        const curSize = 14;
        lns.push(`q ${curSize} 0 0 ${curSize} ${W - M - 72} ${cy + 6} cm /ImCurYellow Do Q`);
        txt((Number(grandTotal) || 0).toFixed(2), W - M - 58, cy + 8, "F2", 14);
    } else {
        txt(fmt(grandTotal), W - M - 70, cy + 8, "F2", 14);
    }
    if (inv.notes) {
        cy -= 60;
        rg(0.059, 0.059, 0.098); txt("NOTES", M, cy, "F2", 11);
        rg(0.3, 0.3, 0.3);
        const noteLines = inv.notes.split('\n');
        noteLines.forEach((line, i) => {
            txt(line, M, cy - 18 - (i * 14), "F1", 9);
        });
        cy -= (noteLines.length * 14) + 14;
    }

    if (qrData) {
        const qrSize = 180; cy -= (qrSize + 40);
        rg(0.95, 0.95, 0.95); rc(M, cy, qrSize + 10, qrSize + 10); fl();
        lns.push(`q ${qrSize} 0 0 ${qrSize} ${M + 5} ${cy + 5} cm /Im1 Do Q`);
        rg(0.4, 0.4, 0.4);
        txt("PAYMENT QR", M + qrSize + 20, cy + 100, "F2", 14);
        txt("SCAN TO PAY", M + qrSize + 20, cy + 80, "F1", 11);
    }

    // Branding
    rg(0.6, 0.6, 0.6);
    const brandingText = "Generated by Billit";
    const brandingWidth = brandingText.length * 10 * 0.5;
    txt(brandingText, W - M - brandingWidth, 30, "F1", 10);
    return { stream: lns.join("\n"), qrData, logoData, curImgData, curImgYellowData };
};

export const getBatchPDF = async (invList, clients, seller, currency, taxRates) => {
    const W = 595, H = 842;
    let objCount = 0; const objects = [];
    const addObj = (content) => {
        const data = typeof content === "string" ? new TextEncoder().encode(content) : content;
        objects.push({ num: ++objCount, data });
        return objCount;
    };

    const catID = addObj("<< /Type /Catalog /Pages 2 0 R >>");
    const pagesID = addObj("");

    const f1ID = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const f2ID = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    const getClient = (id) => clients.find(c => String(c.id) === String(id)) || {};

    const pageIDs = [];
    for (let inv of invList) {
        const { stream, qrData, logoData, curImgData, curImgYellowData } = await getInvoicePageStream(inv, getClient(inv.clientId), seller, currency, taxRates);
        const xObjMap = {};
        if (qrData && qrData.hex) {
            const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${qrData.w} /Height ${qrData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${qrData.hex.length} >>\nstream\n${qrData.hex}\nendstream`);
            xObjMap["Im1"] = id;
        }
        if (logoData && logoData.hex) {
            const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${logoData.w} /Height ${logoData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${logoData.hex.length} >>\nstream\n${logoData.hex}\nendstream`);
            xObjMap["ImLogo"] = id;
        }
        if (curImgData && curImgData.hex) {
            const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${curImgData.w} /Height ${curImgData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${curImgData.hex.length} >>\nstream\n${curImgData.hex}\nendstream`);
            xObjMap["ImCur"] = id;
        }
        if (curImgYellowData && curImgYellowData.hex) {
            const idY = addObj(`<< /Type /XObject /Subtype /Image /Width ${curImgYellowData.w} /Height ${curImgYellowData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${curImgYellowData.hex.length} >>\nstream\n${curImgYellowData.hex}\nendstream`);
            xObjMap["ImCurYellow"] = idY;
        }

        const ctID = addObj(`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`);
        const xObjRes = Object.entries(xObjMap).map(([name, id]) => `/${name} ${id} 0 R`).join(" ");
        const pgID = addObj(`<< /Type /Page /Parent ${pagesID} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${ctID} 0 R /Resources << /Font << /F1 ${f1ID} 0 R /F2 ${f2ID} 0 R >> ${xObjRes ? `/XObject << ${xObjRes} >>` : ""} >> >>`);
        pageIDs.push(pgID);
    }

    objects[1].data = new TextEncoder().encode(`<< /Type /Pages /Kids [${pageIDs.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIDs.length} >>`);

    const enc = new TextEncoder();
    let pdfParts = [enc.encode("%PDF-1.4\n")];
    const offs = [];
    objects.forEach(o => {
        const start = pdfParts.reduce((acc, p) => acc + p.length, 0);
        offs.push(start);
        pdfParts.push(enc.encode(`${o.num} 0 obj\n`), o.data, enc.encode("\nendobj\n"));
    });
    const xOff = pdfParts.reduce((acc, p) => acc + p.length, 0);
    pdfParts.push(enc.encode(`xref\n0 ${objCount + 1}\n0000000000 65535 f \n`));
    offs.forEach(o => pdfParts.push(enc.encode(`${String(o).padStart(10, "0")} 00000 n \n`)));
    pdfParts.push(enc.encode(`trailer << /Size ${objCount + 1} /Root ${catID} 0 R >>\nstartxref\n${xOff}\n%%EOF\n`));

    const totalLen = pdfParts.reduce((acc, p) => acc + p.length, 0);
    const finalPdf = new Uint8Array(totalLen);
    let curIdx = 0;
    pdfParts.forEach(p => { finalPdf.set(p, curIdx); curIdx += p.length; });
    const blob = new Blob([finalPdf], { type: "application/pdf" });
    return { bytes: finalPdf, blob, url: URL.createObjectURL(blob) };
};

export const getPDFData = async (inv, clients, seller, currency, taxRates) => {
    // getBatchPDF expects invList and full clients list for robust lookup
    const pdf = await getBatchPDF([inv], clients, seller, currency, taxRates);
    return pdf.bytes;
};

export const getThermalInventoryPDFData = async (seller, currency, products, taxRates, title = "INVENTORY", defaultNote = "") => {
    let itemH = 0;
    products.forEach(p => { itemH += p.desc ? 22 : 12; });
    const bizH = 50 + (seller?.email ? 10 : 0) + (seller?.phone ? 10 : 0) + (seller?.address ? 10 : 0) + (seller?.gstin ? 10 : 0);
    const W = 226, H = bizH + itemH + 160, M = 10;
    const biz = seller?.name || "";
    const curSymbol = currency?.symbol || "$";
    const isAscii = /^[\x00-\x7F]*$/.test(curSymbol);
    const pdfCur = isAscii ? curSymbol : (currency?.code || "INR");

    let objCount = 0; const objects = [];
    const addObj = (content) => {
        const data = typeof content === "string" ? new TextEncoder().encode(content) : content;
        objects.push({ num: ++objCount, data });
        return objCount;
    };
    const catID = addObj("<< /Type /Catalog /Pages 2 0 R >>");
    const pagesID = addObj("");
    const f1ID = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const f2ID = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    let lns = [];
    const esc = (s) => String(s || "").replace(/[()\\]/g, (c) => "\\" + c);
    const txt = (t, x, y, f, s) => { lns.push("BT", `/${f} ${s} Tf`, `${(Number(x) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} Td`, `(${esc(t)}) Tj`, "ET"); };
    const rg = (r, g, b) => lns.push(`${(Number(r) || 0).toFixed(3)} ${(Number(g) || 0).toFixed(3)} ${(Number(b) || 0).toFixed(3)} rg`);
    const line = (x1, y, x2) => lns.push(`${(Number(x1) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} m ${(Number(x2) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} l s`);

    let cy = H - 30;
    rg(0, 0, 0);
    // Business Name
    if (biz) {
        const bizW = biz.length * 12 * 0.55;
        txt(biz.toUpperCase(), W / 2 - bizW / 2, cy, "F2", 12); cy -= 15;
    }

    const email = seller?.email || "";
    if (email) {
        const ew = email.length * 8 * 0.5;
        txt(email, W / 2 - ew / 2, cy, "F1", 8); cy -= 10;
    }
    const phone = seller?.phone || "";
    if (phone) {
        const pw = phone.length * 8 * 0.5;
        txt(phone, W / 2 - pw / 2, cy, "F1", 8); cy -= 10;
    }

    const addr = seller?.address || "";
    if (addr) {
        const addrW = addr.substring(0, 30).length * 8 * 0.5;
        txt(addr.substring(0, 30), W / 2 - addrW / 2, cy, "F1", 8); cy -= 10;
    }
    const gstin = seller?.gstin ? `GST: ${seller.gstin}` : "";
    if (gstin) {
        const gw = gstin.length * 8 * 0.5;
        txt(gstin, W / 2 - gw / 2, cy, "F1", 8); cy -= 10;
    }

    cy -= 10; // Extra space after business details
    const tW = title.length * 10 * 0.55;
    txt(title.toUpperCase(), W / 2 - tW / 2, cy, "F2", 10); cy -= 20;

    line(M, cy, W - M); cy -= 15;
    txt("Particulars", M, cy, "F2", 8);
    txt("Price", W - M - 40, cy, "F2", 8); cy -= 12;
    line(M, cy, W - M); cy -= 15;

    products.forEach(p => {
        txt(p.name.substring(0, 25), M, cy, "F1", 8);
        const taxes = p.tax || (taxRates || []).map(t => t.id);
        const taxAmt = itemTaxTotal({ ...p, qty: 1, tax: taxes }, taxRates);
        const price = (Number(Number(p.price || 0) + taxAmt) || 0).toFixed(2);
        txt(`${pdfCur}${price}`, W - M - 40, cy, "F1", 8);
        cy -= 12;
        if (p.desc) {
            rg(0.4, 0.4, 0.4);
            txt(p.desc.substring(0, 35), M + 5, cy, "F1", 7); cy -= 10;
            rg(0, 0, 0);
        }
    });

    cy -= 10;
    line(M, cy, W - M); cy -= 20;
    const endMsg = defaultNote || "Visit Again...";
    const ew = endMsg.substring(0, 40).length * 8 * 0.5;
    txt(endMsg.substring(0, 40), W / 2 - ew / 2, cy, "F1", 8);

    // Branding
    rg(0.2, 0.2, 0.2);
    const brandingText = "Generated by Billit";
    const brandingWidth = brandingText.length * 7 * 0.5;
    txt(brandingText, W - M - brandingWidth, cy - 20, "F1", 7);


    const stream = lns.join("\n");
    const ctID = addObj(`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`);
    const pgID = addObj(`<< /Type /Page /Parent ${pagesID} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${ctID} 0 R /Resources << /Font << /F1 ${f1ID} 0 R /F2 ${f2ID} 0 R >> >> >>`);
    objects[1].data = new TextEncoder().encode(`<< /Type /Pages /Kids [${pgID} 0 R] /Count 1 >>`);
    let pdf = "%PDF-1.1\n";
    const xrefs = [];
    objects.forEach(o => { xrefs.push(pdf.length); pdf += `${o.num} 0 obj\n${new TextDecoder("utf-8").decode(o.data)}\nendobj\n`; });
    const startXref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    xrefs.forEach(x => { pdf += `${String(x).padStart(10, "0")} 00000 n \n`; });
    pdf += `trailer << /Size ${objects.length + 1} /Root ${catID} 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
    return new TextEncoder().encode(pdf);
};

export const getThermalInvoicePageStream = async (inv, clients, seller, currency, taxRates, defaultNote = "") => {
    const biz = seller?.name || "BILLIT";
    const isBizAscii = /^[\x00-\x7F]*$/.test(biz);

    const getBizImage = (text) => {
        return new Promise((resolve) => {
            const canvas = document.createElement("canvas");
            const w = 500, h = 60;
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "white"; ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = "black";
            ctx.font = `bold 40px "Noto Sans", sans-serif`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(text.toUpperCase(), w/2, h/2);
            
            const data = ctx.getImageData(0, 0, w, h).data;
            const parts = new Array(data.length / 4 * 3);
            for (let i = 0, k = 0; i < data.length; i += 4) {
                parts[k++] = hexMap[data[i]];
                parts[k++] = hexMap[data[i + 1]];
                parts[k++] = hexMap[data[i + 2]];
            }
            resolve({ hex: parts.join('') + ">", w, h });
        });
    };

    let itemH = inv.items.length * 12;
    const bizH = 70 + (seller?.email ? 10 : 0) + (seller?.phone ? 10 : 0) + (seller?.address ? 10 : 0) + (seller?.gstin ? 10 : 0);
    const client = clients?.find(c => String(c.id) === String(inv.clientId));
    const clientH = client ? 15 : 0;
    const W = 226, H = bizH + itemH + clientH + 220, M = 10;
    const curSymbol = currency?.symbol || "$";
    const isAscii = /^[\x00-\x7F]*$/.test(curSymbol);
    const pdfCur = isAscii ? curSymbol : (currency?.code || "INR");

    let lns = [];
    const esc = (s) => String(s || "").replace(/[()\\]/g, (c) => "\\" + c);
    const txt = (t, x, y, f, s) => { lns.push("BT", `/${f} ${s} Tf`, `${(Number(x) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} Td`, `(${esc(t)}) Tj`, "ET"); };
    const rg = (r, g, b) => lns.push(`${(Number(r) || 0).toFixed(3)} ${(Number(g) || 0).toFixed(3)} ${(Number(b) || 0).toFixed(3)} rg`);
    const line = (x1, y, x2) => lns.push(`${(Number(x1) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} m ${(Number(x2) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} l s`);

    let cy = H - 30;
    rg(0, 0, 0);
    if (biz) {
        const bizW = biz.length * 12 * 0.55;
        txt(biz.toUpperCase(), W / 2 - bizW / 2, cy, "F2", 12); cy -= 15;
    }

    const email = seller?.email || "";
    if (email) {
        const ew = email.length * 8 * 0.5;
        txt(email, W / 2 - ew / 2, cy, "F1", 8); cy -= 10;
    }
    const phone = seller?.phone || "";
    if (phone) {
        const pw = phone.length * 8 * 0.5;
        txt(phone, W / 2 - pw / 2, cy, "F1", 8); cy -= 10;
    }

    const addr = seller?.address || "";
    if (addr) {
        const addrW = addr.substring(0, 30).length * 8 * 0.5;
        txt(addr.substring(0, 30), W / 2 - addrW / 2, cy, "F1", 8); cy -= 10;
    }
    const gstin = seller?.gstin ? `GST: ${seller.gstin}` : "";
    if (gstin) {
        const gw = gstin.length * 8 * 0.5;
        txt(gstin, W / 2 - gw / 2, cy, "F1", 8); cy -= 10;
    }
    cy -= 15;
    txt("Cash Memo", W / 2 - 25, cy, "F1", 8); cy -= 15;
    line(M, cy, W - M); cy -= 10;

    txt(`Date: ${inv.date} ${inv.time || ""}`, M, cy, "F1", 8);
    txt(`Bill No: ${inv.id}`, W - M - 65, cy, "F1", 8); cy -= 12;

    if (client) {
        txt(`Customer: ${client.name}`, M, cy, "F1", 8); cy -= 12;
    }

    line(M, cy, W - M); cy -= 15;

    txt("Particulars", M, cy, "F2", 8);
    txt("Qty", W - M - 80, cy, "F2", 8);
    txt("Rate", W - M - 55, cy, "F2", 8);
    txt("Amount", W - M - 30, cy, "F2", 8); cy -= 12;
    line(M, cy, W - M); cy -= 15;

    inv.items.forEach(it => {
        txt(it.desc.substring(0, 20), M, cy, "F1", 8);
        txt(String(it.qty), W - M - 78, cy, "F1", 8);
        txt((Number(it.price) || 0).toFixed(2), W - M - 58, cy, "F1", 8);
        const totalAmt = (Number(it.qty * it.price + itemTaxTotal(it, taxRates)) || 0).toFixed(2);
        txt(totalAmt, W - M - 30, cy, "F1", 8);
        cy -= 12;
    });

    cy -= 10;
    line(M, cy, W - M); cy -= 15;
    const sub = (Number(total(inv.items)) || 0).toFixed(2);
    const subStr = `Sub Total : ${sub}`;
    txt(subStr, W - M - (subStr.length * 9 * 0.5), cy, "F1", 9); cy -= 12;

    const taxBreakdown = {};
    (inv.items || []).forEach(it => {
        getItemTaxList(it, taxRates).forEach(t => {
            const key = `${t.label} (${t.rate}%)`;
            taxBreakdown[key] = (taxBreakdown[key] || 0) + t.amount;
        });
    });

    Object.entries(taxBreakdown).forEach(([label, amount]) => {
        const lineStr = `${label} : ${(Number(amount) || 0).toFixed(2)}`;
        txt(lineStr, W - M - (lineStr.length * 8 * 0.5), cy, "F1", 8);
        cy -= 10;
    });

    const taxGrand = (Number((inv.items || []).reduce((s, it) => s + itemTaxTotal(it, taxRates), 0)) || 0).toFixed(2);
    const taxStr = `Tax Total : ${taxGrand}`;
    txt(taxStr, W - M - (taxStr.length * 9 * 0.5), cy, "F2", 9); cy -= 15;

    line(M, cy, W - M); cy -= 20;

    const grand = (Number(totalWithTax(inv.items, taxRates)) || 0).toFixed(2);
    txt("Total :", M + 20, cy, "F2", 12);
    const grandStr = grand;
    txt(grandStr, W - M - (grandStr.length * 12 * 0.6), cy, "F2", 12); cy -= 30;
    const endMsg = defaultNote || "Thank You Visit Again...";
    const ew = endMsg.substring(0, 45).length * 8 * 0.5;
    txt(endMsg.substring(0, 45), W / 2 - ew / 2, cy, "F1", 8);

    // Branding
    rg(0.2, 0.2, 0.2);
    const brandingText = "Generated by Billit";
    const brandingWidth = brandingText.length * 7 * 0.5;
    txt(brandingText, W - M - brandingWidth, cy - 20, "F1", 7);

    return { stream: lns.join("\n"), W, H };
};

export const getBatchThermalPDF = async (invList, clients, seller, currency, taxRates, defaultNote = "") => {
    let objCount = 0; const objects = [];
    const addObj = (content) => {
        const data = typeof content === "string" ? new TextEncoder().encode(content) : content;
        objects.push({ num: ++objCount, data });
        return objCount;
    };

    const catID = addObj("<< /Type /Catalog /Pages 2 0 R >>");
    const pagesID = addObj("");

    const f1ID = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const f2ID = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    const pageIDs = [];
    for (let inv of invList) {
        const { stream, W, H } = await getThermalInvoicePageStream(inv, clients, seller, currency, taxRates, defaultNote);
        const ctID = addObj(`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`);
        const pgID = addObj(`<< /Type /Page /Parent ${pagesID} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${ctID} 0 R /Resources << /Font << /F1 ${f1ID} 0 R /F2 ${f2ID} 0 R >> >> >>`);
        pageIDs.push(pgID);
    }

    objects[1].data = new TextEncoder().encode(`<< /Type /Pages /Kids [${pageIDs.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIDs.length} >>`);

    const enc = new TextEncoder();
    let pdfParts = [enc.encode("%PDF-1.4\n")];
    const offs = [];
    objects.forEach(o => {
        const start = pdfParts.reduce((acc, p) => acc + p.length, 0);
        offs.push(start);
        pdfParts.push(enc.encode(`${o.num} 0 obj\n`), o.data, enc.encode("\nendobj\n"));
    });
    const xOff = pdfParts.reduce((acc, p) => acc + p.length, 0);
    pdfParts.push(enc.encode(`xref\n0 ${objCount + 1}\n0000000000 65535 f \n`));
    offs.forEach(o => pdfParts.push(enc.encode(`${String(o).padStart(10, "0")} 00000 n \n`)));
    pdfParts.push(enc.encode(`trailer << /Size ${objCount + 1} /Root ${catID} 0 R >>\nstartxref\n${xOff}\n%%EOF\n`));

    const totalLen = pdfParts.reduce((acc, p) => acc + p.length, 0);
    const finalPdf = new Uint8Array(totalLen);
    let curIdx = 0;
    pdfParts.forEach(p => { finalPdf.set(p, curIdx); curIdx += p.length; });
    const blob = new Blob([finalPdf], { type: "application/pdf" });
    return { bytes: finalPdf, blob, url: URL.createObjectURL(blob) };
};

export const getThermalPDFData = async (inv, clients, seller, currency, taxRates, defaultNote = "") => {
    const pdf = await getBatchThermalPDF([inv], clients, seller, currency, taxRates, defaultNote);
    return pdf.bytes;
};
