// Professional PDF Engine for Billit - High Performance - Local First
import { total, getItemTaxList, itemTaxTotal, totalWithTax, formatCurrency } from "./calculations";
import { getProductImage } from "./db";
import { numberToWords } from "./numWords";

const hexMap = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0').toUpperCase());
const fmtNum = (n) => (Number(n) || 0).toFixed(2);

const fetchAsDataURL = async (url) => {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Failed to fetch image as data URL:", e);
        return null;
    }
};

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

const getBizImage = (text) => {
    if (!text) return Promise.resolve(null);
    if (imgCache.biz[text]) return Promise.resolve(imgCache.biz[text]);

    return new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        const w = 500, h = 60;
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "white"; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "black";
        ctx.font = `bold 40px "Noto Sans", sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(text.toUpperCase(), w / 2, h / 2);

        const data = ctx.getImageData(0, 0, w, h).data;
        const parts = new Array(data.length / 4 * 3);
        for (let i = 0, k = 0; i < data.length; i += 4) {
            parts[k++] = hexMap[data[i]];
            parts[k++] = hexMap[data[i + 1]];
            parts[k++] = hexMap[data[i + 2]];
        }
        const result = { hex: parts.join('') + ">", w, h };
        imgCache.biz[text] = result;
        resolve(result);
    });
};

const getLines = (text, size, maxW) => {
    const words = String(text || "").split(' ');
    const lines = [];
    let current = "";
    const limit = Math.max(1, Math.floor(maxW / (size * 0.55)));
    words.forEach(word => {
        if ((current + (current ? " " : "") + word).length <= limit) {
            current += (current ? " " : "") + word;
        } else {
            if (current) lines.push(current);
            let w = word;
            while (w.length > limit) {
                lines.push(w.substring(0, limit));
                w = w.substring(limit);
            }
            current = w;
        }
    });
    if (current) lines.push(current);
    return lines;
};

export const getInventoryPDFData = async (seller, currency, products, taxRates, title = "INVENTORY LIST", plan = "free") => {
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

    const annots = [];
    const addAnnot = (rect, url) => {
        const id = addObj(`<< /Type /Annot /Subtype /Link /Rect [${rect.map(r => r.toFixed(2)).join(" ")}] /Border [0 0 0] /A << /S /URI /URI (${esc(url)}) >> >>`);
        annots.push(`${id} 0 R`);
    };

    const catID = addObj("<< /Type /Catalog /Pages 2 0 R >>");
    const pagesID = addObj(""); // Placeholder for Pages
    const f1ID = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const f2ID = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    const rTxt = (t, rightX, y, f, defaultSize, maxW) => {
        const estW = String(t).length * defaultSize * 0.6;
        let s = defaultSize;
        let finalW = estW;
        if (estW > maxW) {
            s = Math.max(5, maxW / (String(t).length * 0.6));
            finalW = maxW;
        }
        txt(t, rightX - finalW, y, f, s);
    };

    const qrData = seller.qrCode ? await getQRImage(seller.qrCode) : null;
    const logoData = seller.logo ? await getQRImage(seller.logo) : null;

    const bz = seller.name || "BUSINESS";
    const bzTitle = seller.logoName || bz;

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

    if (logoData && logoData.hex) {
        const imgSize = 45;
        lns.push(`q ${imgSize} 0 0 ${imgSize} ${M} ${H - 85} cm /ImLogo Do Q`);
        const lName = seller.logoName;
        if (lName) {
            const lw = lName.length * 7 * 0.5;
            rg(0.4, 0.4, 0.4); txt(lName, M + (imgSize / 2) - (lw / 2), H - 85 - 10, "F2", 7);
        }
    }

    let docY = H - 50;
    rg(0.05, 0.05, 0.1);
    getLines(biz.toUpperCase(), 22, 350).forEach(wLine => {
        const wBiz = wLine.length * 22 * 0.55;
        txt(wLine, W / 2 - (wBiz / 2), docY, "F2", 22);
        docY -= 25;
    });

    rg(0.3, 0.3, 0.3);
    const headerDetails = [
        seller.description,
        seller.address,
        seller.locationUrl,
        [seller.email, seller.phone].filter(Boolean).join(" | ")
    ].filter(Boolean);

    headerDetails.forEach(line => {
        const wrapped = getLines(line, 8, 350);
        wrapped.forEach(wLine => {
            const lw = wLine.length * 8 * 0.5;
            const x = W / 2 - (lw / 2);
            if (line === seller.locationUrl) {
                rg(0.0, 0.4, 0.8);
                txt(wLine, x, docY, "F1", 8);
                addAnnot([x, docY - 2, x + lw, docY + 8], seller.locationUrl);
                rg(0.3, 0.3, 0.3);
            } else if (line.includes(seller.email) && seller.email) {
                const parts = line.split(" | ");
                let currentX = x;
                parts.forEach((part, pIdx) => {
                    const isEmail = part.includes(seller.email);
                    if (isEmail) {
                        const labelPart = "Email: ";
                        txt(labelPart, currentX, docY, "F1", 8);
                        currentX += labelPart.length * 8 * 0.5;

                        const emailValue = seller.email;
                        const ew = emailValue.length * 8 * 0.6;
                        rg(0.0, 0.4, 0.8); // Blue
                        txt(emailValue, currentX, docY, "F1", 8);
                        addAnnot([currentX, docY - 2, currentX + ew, docY + 8], `mailto:${emailValue}`);
                        currentX += ew;
                        rg(0.3, 0.3, 0.3); // Restore Back
                    } else {
                        txt(part, currentX, docY, "F1", 8);
                        currentX += part.length * 8 * 0.5;
                    }
                    if (pIdx < parts.length - 1) {
                        txt(" | ", currentX, docY, "F1", 8);
                        currentX += 3 * 8 * 0.5;
                    }
                });
            } else {
                txt(wLine, x, docY, "F1", 8);
            }
            docY -= 10;
        });
    });

    const subtitle = (title || "INVENTORY LIST").toUpperCase();
    const subWidth = subtitle.length * 14 * 0.5;
    docY -= 12; // extra gap between business details and title
    rg(0.9, 0.9, 0.9); lns.push(`${M} ${docY} m ${W - M} ${docY} l s`);
    docY -= 20;
    
    rg(0.4, 0.4, 0.4); txt(subtitle, W / 2 - (subWidth / 2), docY, "F1", 14);
    docY -= 25;

    rg(0.9, 0.9, 0.9); lns.push(`${M} ${docY} m ${W - M} ${docY} l s`);
    docY -= 30;

    // ── Dynamic columns ──────────────────────────────────────────────────────
    const showHSN = products.some(p => !!(p.hsn && String(p.hsn).trim()));

    // Column X positions  (W=595, M=40, usable = 515)
    const col = {
        sno:   { x: M + 5,   w: 35  },
        name:  { x: M + 45,  w: showHSN ? 155 : 215 },
        hsn:   { x: M + 205, w: 70  },                 // only drawn if showHSN
        price: { x: showHSN ? M + 280 : M + 265, w: showHSN ? 120 : 130 },
        total: { x: showHSN ? M + 405 : M + 400, w: showHSN ? 110 : 115 },
    };

    // ── Table header row ─────────────────────────────────────────────────────
    let cy = docY;
    const tableTop = cy + 10;

    // Header background
    rg(0.95, 0.95, 0.97); rc(M, cy - 6, W - 2 * M, 22); fl();

    rg(0.1, 0.1, 0.1);
    txt("S.No",          M + 5,          cy, "F2", 8);
    txt("PRODUCT DETAILS", col.name.x,   cy, "F2", 8);
    if (showHSN) txt("HSN/SNC", col.hsn.x, cy, "F2", 8);
    txt("PRICE/EACH",    col.price.x,    cy, "F2", 8);
    txt("TOTAL VALUE",   col.total.x,    cy, "F2", 8);

    rg(0.75, 0.75, 0.80);
    lns.push(`${M} ${cy - 8} m ${W - M} ${cy - 8} l s`);
    cy -= 28;

    // ── Data rows ─────────────────────────────────────────────────────────────
    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        if (cy < M + 80) break;

        // Alternating row shade
        if (i % 2 === 0) {
            rg(0.97, 0.97, 0.99); rc(M, cy - 12, W - 2 * M, 28); fl();
        }

        const pImg = prodImages.find(img => img.id === p.id);
        const hasImg = pImg && pImg.data && pImg.data.hex;

        // S.No
        rg(0.45, 0.45, 0.45); txt(`${i + 1}`, M + 5, cy, "F1", 8);

        // Product name + category
        rg(0.05, 0.05, 0.1);
        const nameMaxChars = showHSN ? 22 : 30;
        const pName = (p.name || "N/A").substring(0, nameMaxChars);
        txt(pName, col.name.x, cy, "F2", 9);
        const catText = p.category ? p.category.substring(0, 18) : "";
        if (catText) {
            rg(0.5, 0.5, 0.5);
            txt(catText, col.name.x, cy - 11, "F1", 7);
        }

        // HSN (conditional)
        if (showHSN) {
            rg(0.3, 0.3, 0.3);
            txt((p.hsn || "").substring(0, 10), col.hsn.x, cy, "F1", 8);
        }

        // Price/Each
        const price = Number(p.price || 0);
        const stockQty = Number(p.stock || 0);
        const totalVal = price * stockQty;
        rg(0.05, 0.05, 0.1);
        txt(fmtNum(price), col.price.x, cy, "F2", 9);

        // Total value — right-aligned in its column
        rTxt(fmtNum(totalVal), col.total.x + col.total.w - 5, cy, "F2", 9, col.total.w - 8);

        // Product image thumbnail
        if (hasImg) {
            const imgName = `ImP${i}`;
            const pId = addObj(`<< /Type /XObject /Subtype /Image /Width ${pImg.data.w} /Height ${pImg.data.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${pImg.data.hex.length} >>\nstream\n${pImg.data.hex}\nendstream`);
            xObjMap[imgName] = pId;
            lns.push(`q 20 0 0 20 ${M + 16} ${cy - 8} cm /${imgName} Do Q`);
        }

        rg(0.88, 0.88, 0.92);
        lns.push(`${M} ${cy - 14} m ${W - M} ${cy - 14} l s`);
        cy -= 32;
    }

    // ── Grid borders ─────────────────────────────────────────────────────────
    const tableBottom = cy + 28;
    rg(0.7, 0.7, 0.75);
    // Outer box
    lns.push(`${M} ${tableTop} m ${M} ${tableBottom} l s`);
    lns.push(`${W - M} ${tableTop} m ${W - M} ${tableBottom} l s`);
    lns.push(`${M} ${tableTop} m ${W - M} ${tableTop} l s`);
    lns.push(`${M} ${tableBottom} m ${W - M} ${tableBottom} l s`);
    // Internal vertical dividers
    const divX1 = M + 40;
    const divX2 = col.name.x + col.name.w;
    const divX3 = showHSN ? col.hsn.x + col.hsn.w : null;
    const divX4 = col.price.x + col.price.w;
    [divX1, divX2, divX3, divX4].filter(Boolean).forEach(x => {
        lns.push(`${x} ${tableTop} m ${x} ${tableBottom} l s`);
    });

    if (qrData) {
        const qrSize = 90;
        const qrY = Math.max(cy - qrSize - 20, M + 10);
        rg(0.96, 0.96, 0.96); rc(M, qrY, qrSize + 10, qrSize + 10); fl();
        lns.push(`q ${qrSize} 0 0 ${qrSize} ${M + 5} ${qrY + 5} cm /ImQR Do Q`);
        rg(0.4, 0.4, 0.4);
        txt("SCAN TO PAY / CONTACT", M + qrSize + 25, qrY + (qrSize / 2) + 5, "F2", 9);
    }
    if (plan === "free") {
        const brandingText = "Generated with Billit. Professional. Fast. Free.";
        const brandingWidth = brandingText.length * 7 * 0.5;
        txt(brandingText, W - M - brandingWidth, 20, "F1", 7);
    }


    const stream = lns.join("\n");
    const ctID = addObj(`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`);
    const xObjRes = Object.entries(xObjMap).map(([name, id]) => `/${name} ${id} 0 R`).join(" ");
    const annStr = annots.length ? `/Annots [${annots.join(" ")}]` : "";
    const pgID = addObj(`<< /Type /Page /Parent ${pagesID} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${ctID} 0 R ${annStr} /Resources << /Font << /F1 ${f1ID} 0 R /F2 ${f2ID} 0 R >> ${xObjRes ? `/XObject << ${xObjRes} >>` : ""} >> >>`);
    objects[1].data = new TextEncoder().encode(`<< /Type /Pages /Kids [${pgID} 0 R] /Count 1 >>`);

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
    return finalPdf;
};

export const getClientListPDFData = async (seller, clients, invoices, taxRates, currency, plan = "free") => {
    const biz = seller?.name || "BILLIT";
    const isBizAscii = /^[\x00-\x7F]*$/.test(biz);

    const W = 595, H = 842, M = 40;
    const esc = (s) => String(s || "").replace(/[()\\]/g, (c) => "\\" + c);

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

    const logoData = seller.logo ? await getQRImage(seller.logo) : null;
    const curSymbol = currency?.symbol || "$";
    const isAscii = /^[\x00-\x7F]*$/.test(curSymbol);
    const pdfCur = isAscii ? curSymbol : (currency?.code || "INR");
    const curImgData = !isAscii ? await getCurrencySymbolImage(curSymbol) : null;

    let lns = [];
    const txt = (t, x, y, f, s) => { lns.push("BT", `/${f} ${s} Tf`, `${(Number(x) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} Td`, `(${esc(t)}) Tj`, "ET"); };
    const rc = (x, y, w, h) => lns.push(`${(Number(x) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} ${(Number(w) || 0).toFixed(2)} ${(Number(h) || 0).toFixed(2)} re`);
    const fl = () => lns.push("f"); const rg = (r, g, b) => lns.push(`${(Number(r) || 0).toFixed(3)} ${(Number(g) || 0).toFixed(3)} ${(Number(b) || 0).toFixed(3)} rg`);

    const rTxt = (t, rightX, y, f, defaultSize, maxW) => {
        const estW = String(t).length * defaultSize * 0.6;
        let s = defaultSize;
        let finalW = estW;
        if (estW > maxW) {
            s = Math.max(5, maxW / (String(t).length * 0.6));
            finalW = maxW;
        }
        txt(t, rightX - finalW, y, f, s);
    };

    const annots = [];
    const addAnnot = (rect, url) => {
        const id = addObj(`<< /Type /Annot /Subtype /Link /Rect [${rect.map(r => r.toFixed(2)).join(" ")}] /Border [0 0 0] /A << /S /URI /URI (${esc(url)}) >> >>`);
        annots.push(`${id} 0 R`);
    };

    const xObjMap = {};
    if (logoData && logoData.hex) {
        const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${logoData.w} /Height ${logoData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${logoData.hex.length} >>\nstream\n${logoData.hex}\nendstream`);
        xObjMap["ImLogo"] = id;
    }
    if (curImgData && curImgData.hex) {
        const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${curImgData.w} /Height ${curImgData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${curImgData.hex.length} >>\nstream\n${curImgData.hex}\nendstream`);
        xObjMap["ImCur"] = id;
    }

    // White background - removed dark rectangle fill

    if (logoData) {
        const imgSize = 45;
        lns.push(`q ${imgSize} 0 0 ${imgSize} ${M} ${H - 85} cm /ImLogo Do Q`);
        const lName = seller.logoName;
        if (lName) {
            const lw = lName.length * 7 * 0.5;
            rg(0.4, 0.4, 0.4); txt(lName, M + (imgSize / 2) - (lw / 2), H - 85 - 10, "F2", 7);
        }
    }

    let docY = H - 50;
    rg(0.05, 0.05, 0.1);
    getLines(biz.toUpperCase(), 22, 350).forEach(wLine => {
        const wBiz = wLine.length * 22 * 0.55;
        txt(wLine, W / 2 - (wBiz / 2), docY, "F2", 22);
        docY -= 25;
    });

    rg(0.3, 0.3, 0.3);
    const headerDetails = [
        seller.description,
        seller.address,
        seller.locationUrl,
        [seller.email, seller.phone].filter(Boolean).join(" | ")
    ].filter(Boolean);

    headerDetails.forEach(line => {
        const wrapped = getLines(line, 8, 350);
        wrapped.forEach(wLine => {
            const lw = wLine.length * 8 * 0.5;
            const x = W / 2 - (lw / 2);
            if (line === seller.locationUrl) {
                rg(0.0, 0.4, 0.8);
                txt(wLine, x, docY, "F1", 8);
                addAnnot([x, docY - 2, x + lw, docY + 8], seller.locationUrl);
                rg(0.3, 0.3, 0.3);
            } else if (line.includes(seller.email) && seller.email) {
                const parts = line.split(" | ");
                let currentX = x;
                parts.forEach((part, pIdx) => {
                    const isEmail = part.includes(seller.email);
                    if (isEmail) {
                        const labelPart = "Email: ";
                        txt(labelPart, currentX, docY, "F1", 8);
                        currentX += labelPart.length * 8 * 0.5;

                        const emailValue = seller.email;
                        const ew = emailValue.length * 8 * 0.6;
                        rg(0.0, 0.4, 0.8); // Blue
                        txt(emailValue, currentX, docY, "F1", 8);
                        addAnnot([currentX, docY - 2, currentX + ew, docY + 8], `mailto:${emailValue}`);
                        currentX += ew;
                        rg(0.3, 0.3, 0.3); // Restore Back
                    } else {
                        txt(part, currentX, docY, "F1", 8);
                        currentX += part.length * 8 * 0.5;
                    }
                    if (pIdx < parts.length - 1) {
                        txt(" | ", currentX, docY, "F1", 8);
                        currentX += 3 * 8 * 0.5;
                    }
                });
            } else {
                txt(wLine, x, docY, "F1", 8);
            }
            docY -= 10;
        });
    });

    docY -= 10;
    rg(0.9, 0.9, 0.9); lns.push(`${M} ${docY} m ${W - M} ${docY} l s`);
    docY -= 20;

    const subtitle = "CLIENT LIST";
    const subWidth = subtitle.length * 14 * 0.5;
    rg(0.4, 0.4, 0.4); txt(subtitle, W / 2 - (subWidth / 2), docY, "F1", 14);
    docY -= 20;

    rg(0.9, 0.9, 0.9); lns.push(`${M} ${docY} m ${W - M} ${docY} l s`);

    let cy = docY - 45;
    const tableTop = cy + 15;
    rg(0.1, 0.1, 0.1);
    txt("S.No", M + 5, cy, "F2", 9);
    txt("CLIENT NAME", M + 45, cy, "F2", 9);
    
    rg(0.85, 0.85, 0.85); lns.push(`${M} ${cy - 10} m ${W - M} ${cy - 10} l s`);
    cy -= 30;

    clients.forEach((c, idx) => {
        if (cy < M + 50) return;
        rg(0.93, 0.93, 0.96); rc(M, cy - 8, W - 2 * M, 24); fl();
        rg(0.4, 0.4, 0.4); txt(`${idx + 1}`, M + 5, cy, "F1", 9);
        rg(0.05, 0.05, 0.1);
        txt(c.name || "N/A", M + 45, cy, "F2", 10);
        rg(0.85, 0.85, 0.85); lns.push(`${M} ${cy - 8} m ${W - M} ${cy - 8} l s`);
        cy -= 25;
    });

    const tableBottom = cy + 20;
    rg(0.85, 0.85, 0.85);
    lns.push(`${M} ${tableTop} m ${M} ${tableBottom} l s`);            // Left edge
    lns.push(`${M + 40} ${tableTop} m ${M + 40} ${tableBottom} l s`); // After S.No
    lns.push(`${W - M} ${tableTop} m ${W - M} ${tableBottom} l s`);   // Right edge
    lns.push(`${M} ${tableTop} m ${W - M} ${tableTop} l s`);          // Top border
    lns.push(`${M} ${tableBottom} m ${W - M} ${tableBottom} l s`);    // Bottom border

    if (plan === "free") {
        rg(0.6, 0.6, 0.6);
        const brandingText = "Generated with Billit. Professional. Fast. Free.";
        const brandingWidth = brandingText.length * 7 * 0.5;
        txt(brandingText, W - M - brandingWidth, 20, "F1", 7);
    }

    const stream = lns.join("\n");
    const ctID = addObj(`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`);
    const xObjRes = Object.entries(xObjMap).map(([name, id]) => `/${name} ${id} 0 R`).join(" ");
    const annStr = annots.length ? `/Annots [${annots.join(" ")}]` : "";
    const pgID = addObj(`<< /Type /Page /Parent ${pagesID} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${ctID} 0 R ${annStr} /Resources << /Font << /F1 ${f1ID} 0 R /F2 ${f2ID} 0 R >> ${xObjRes ? `/XObject << ${xObjRes} >>` : ""} >> >>`);
    objects[1].data = new TextEncoder().encode(`<< /Type /Pages /Kids [${pgID} 0 R] /Count 1 >>`);

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
    return finalPdf;
};

export const getInvoicePageStream = async (inv, client, seller, currency, taxRates, title = "INVOICE", plan = "free") => {
    const biz = seller.companyName || seller.name || "MY BUSINESS";
    const bzTitle = seller.logoName || biz;
    const isBizAscii = /^[\x00-\x7F]*$/.test(biz);


    const W = 595, H = 842, M = 40;
    const esc = (s) => String(s || "").replace(/[()\\]/g, (c) => "\\" + c);
    let lns = [];
    const annots = [];
    const move = (x, y) => lns.push(`${x.toFixed(2)} ${y.toFixed(2)} m`);
    const lto = (x, y) => lns.push(`${x.toFixed(2)} ${y.toFixed(2)} l`);
    const txt = (t, x, y, f, s) => { lns.push("BT", `/${f} ${s} Tf`, `${(Number(x) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} Td`, `(${esc(t)}) Tj`, "ET"); };
    const rTxt = (t, rightX, y, f, defaultSize, maxW) => {
        const estW = String(t).length * defaultSize * 0.6;
        let s = defaultSize;
        let finalW = estW;
        if (estW > maxW) {
            s = Math.max(5, maxW / (String(t).length * 0.6));
            finalW = maxW;
        }
        txt(t, rightX - finalW, y, f, s);
    };
    const rc = (x, y, w, h) => lns.push(`${(Number(x) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} ${(Number(w) || 0).toFixed(2)} ${(Number(h) || 0).toFixed(2)} re`);
    const fl = () => lns.push("f"); const rg = (r, g, b) => lns.push(`${(Number(r) || 0).toFixed(3)} ${(Number(g) || 0).toFixed(3)} ${(Number(b) || 0).toFixed(3)} rg`);

    let qrData = null;
    if (seller.qrCode) {
        qrData = await getQRImage(seller.qrCode);
    } else if (seller.upiId) {
        const amt = totalWithTax(inv.items, taxRates);
        const upiUrl = `upi://pay?pa=${seller.upiId}&pn=${encodeURIComponent(seller.name || "Merchant")}&am=${amt}&tn=${encodeURIComponent(inv.id)}&cu=${currency?.code || "INR"}`;
        const qrServerUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`;
        const base64Qr = await fetchAsDataURL(qrServerUrl);
        if (base64Qr) {
            qrData = await getQRImage(base64Qr);
        }
    }
    const logoData = seller.logo ? await getQRImage(seller.logo) : null;
    let bizImgData = null;
    const centerX = W / 2;
    const themeId = seller.pdfTheme || "classic";

    // Section 1: Business Identification
    let bizY = H - 35;

    // Top Row: GSTIN (Right)
    rg(0, 0, 0);
    const gstStr = seller.gstin ? `GSTIN: ${seller.gstin}` : "";
    if (gstStr) txt(gstStr, W - M - (gstStr.length * 8 * 0.5), H - 35, "F2", 8);

    const docTitle = (title || "INVOICE").toUpperCase();
    const details = [
        seller.description,
        seller.address,
        seller.locationUrl,
        [seller.email, seller.phone && `Phone: ${seller.phone}`].filter(Boolean).join(" | ")
    ].filter(Boolean);

    if (themeId === "minimal") {
        // --- MINIMAL THEME HEADER ---
        rg(0.1, 0.1, 0.1);
        const docW = docTitle.length * 13 * 0.55;
        txt(docTitle, W - M - docW, H - 40, "F2", 13);

        let headerLeftOffset = 0;
        if (logoData && logoData.hex) {
            headerLeftOffset = 65;
            const logoSize = 45;
            lns.push(`q ${logoSize} 0 0 ${logoSize} ${M} ${H - M - logoSize} cm /ImLogo Do Q`);
        }

        const bX = M + headerLeftOffset;
        let bY = H - 40;

        if (isBizAscii) {
            rg(0.1, 0.1, 0.1);
            txt(biz, bX, bY, "F2", 18);
            bY -= 18;
        } else {
            bizImgData = await getBizImage(biz);
            if (bizImgData && bizImgData.hex) {
                const dw = 140, dh = 14;
                lns.push(`q ${dw} 0 0 ${dh} ${bX} ${bY - 4} cm /ImBiz Do Q`);
            }
            bY -= 18;
        }

        rg(0.4, 0.4, 0.4);
        details.forEach(line => {
            getLines(line, 8, centerX - 10).forEach(wLine => {
                if (line === seller.locationUrl) {
                    rg(0.0, 0.4, 0.8);
                    txt(wLine, bX, bY, "F1", 7.5);
                    annots.push({ rect: [bX, bY - 2, bX + wLine.length * 4, bY + 8], url: seller.locationUrl });
                    rg(0.4, 0.4, 0.4);
                } else if (line.includes(seller.email) && seller.email) {
                    const parts = line.split(" | ");
                    let currentX = bX;
                    parts.forEach((part, pIdx) => {
                        const isEmail = part.includes(seller.email);
                        if (isEmail) {
                            txt("Email: ", currentX, bY, "F1", 7.5);
                            currentX += 7 * 7.5 * 0.5;
                            rg(0.0, 0.4, 0.8);
                            txt(seller.email, currentX, bY, "F1", 7.5);
                            annots.push({ rect: [currentX, bY - 2, currentX + seller.email.length * 4.5, bY + 8], url: `mailto:${seller.email}` });
                            currentX += seller.email.length * 4.5;
                            rg(0.4, 0.4, 0.4);
                        } else {
                            txt(part, currentX, bY, "F1", 7.5);
                            currentX += part.length * 7.5 * 0.55;
                        }
                        if (pIdx < parts.length - 1) {
                            txt(" | ", currentX, bY, "F1", 7.5);
                            currentX += 3 * 7.5 * 0.5;
                        }
                    });
                } else {
                    txt(wLine, bX, bY, "F1", 7.5);
                }
                bY -= 9;
            });
        });
        bizY = Math.min(bizY, bY - 10);
    } else {
        // --- CLASSIC & BOLD THEME HEADERS ---
        if (logoData && logoData.hex) {
            const logoSize = 55;
            lns.push(`q ${logoSize} 0 0 ${logoSize} ${M} ${H - M - logoSize} cm /ImLogo Do Q`);
            const lName = seller.logoName;
            if (lName) {
                const lw = lName.length * 7 * 0.5;
                rg(0.4, 0.4, 0.4); txt(lName, M + (logoSize / 2) - (lw / 2), H - M - logoSize - 10, "F2", 7);
            }
        }

        rg(0.4, 0.4, 0.4);
        const docW = docTitle.length * 14 * 0.55;
        txt(docTitle, centerX - (docW / 2), bizY, "F2", 14);
        bizY -= 28;

        if (isBizAscii) {
            rg(0.1, 0.1, 0.1);
            getLines(biz, 24, 350).forEach(wLine => {
                const wBiz = wLine.length * 24 * 0.55;
                txt(wLine, centerX - (wBiz / 2), bizY, "F2", 24);
                bizY -= 25;
            });
        } else {
            bizImgData = await getBizImage(biz);
            if (bizImgData && bizImgData.hex) {
                const dw = 180, dh = 18;
                let bizX = centerX - (dw / 2);
                lns.push(`q ${dw} 0 0 ${dh} ${bizX} ${bizY} cm /ImBiz Do Q`);
            }
            bizY -= 25;
        }

        if (themeId === "bold") {
            rg(0.08, 0.25, 0.45);
            rc(centerX - 100, bizY + 12, 200, 2); lns.push("f");
            bizY -= 5;
        }

        rg(0.3, 0.3, 0.3);
        details.forEach(line => {
            const wrapped = getLines(line, 8, 350);
            wrapped.forEach(wLine => {
                const lw = wLine.length * 8 * 0.5;
                const x = centerX - (lw / 2);
                if (line === seller.locationUrl) {
                    rg(0.0, 0.4, 0.8);
                    txt(wLine, x, bizY, "F1", 8);
                    annots.push({ rect: [x, bizY - 2, x + lw, bizY + 8], url: seller.locationUrl });
                    rg(0.3, 0.3, 0.3);
                } else if (line.includes(seller.email) && seller.email) {
                    const parts = line.split(" | ");
                    let currentX = x;
                    parts.forEach((part, pIdx) => {
                        const isEmail = part.includes(seller.email);
                        if (isEmail) {
                            txt("Email: ", currentX, bizY, "F1", 8);
                            currentX += 7 * 8 * 0.5;
                            rg(0.0, 0.4, 0.8);
                            txt(seller.email, currentX, bizY, "F1", 8);
                            annots.push({ rect: [currentX, bizY - 2, currentX + seller.email.length * 4.5, bizY + 8], url: `mailto:${seller.email}` });
                            currentX += seller.email.length * 4.5;
                            rg(0.3, 0.3, 0.3);
                        } else {
                            txt(part, currentX, bizY, "F1", 8);
                            currentX += part.length * 8 * 0.5;
                        }
                        if (pIdx < parts.length - 1) {
                            txt(" | ", currentX, bizY, "F1", 8);
                            currentX += 3 * 8 * 0.5;
                        }
                    });
                } else {
                    txt(wLine, x, bizY, "F1", 8);
                }
                bizY -= 10;
            });
        });
    }

    // Prepare Left side Client Info
    const clDataProps = [
        { t: client?.name || "Customer", f: "F2", s: 9 },
        { t: client?.email, f: "F1", s: 9, isEmail: true },
        { t: client?.phone, f: "F1", s: 9 },
        { t: client?.address, f: "F1", s: 9 },
        { t: client?.gstin && `Party's GST No: ${client.gstin}`, f: "F1", s: 9 }
    ].filter(i => Boolean(i.t));

    const maxClientW = (centerX + 30) - (M + 15);
    const wrapClData = [];
    clDataProps.forEach(d => {
        getLines(d.t, d.s, maxClientW).forEach(l => wrapClData.push({ t: l, f: d.f, s: d.s, isEmail: d.isEmail }));
    });

    // --- SUB-HEADER (The Boxed Section) ---
    let cy = bizY - 15;
    const boxH = Math.max(90, (wrapClData.length + 1) * 12 + 20);

    if (themeId === "minimal") {
        rg(0.7, 0.7, 0.7);
        move(M, cy); lto(W - M, cy); lns.push("s");
        move(M, cy - boxH); lto(W - M, cy - boxH); lns.push("s");
    } else if (themeId === "bold") {
        rg(0.97, 0.97, 0.98); rc(M, cy - boxH, W - 2 * M, boxH); lns.push("f");
        rg(0.8, 0.8, 0.85); rc(M, cy - boxH, W - 2 * M, boxH); lns.push("s");
        rg(0.08, 0.25, 0.45); rc(M, cy - boxH, 4, boxH); lns.push("f");
        rg(0.8, 0.8, 0.85); move(centerX + 30, cy); lto(centerX + 30, cy - boxH); lns.push("s");
    } else {
        rg(0, 0, 0);
        rc(M, cy - boxH, W - 2 * M, boxH); lns.push("s");
        move(centerX + 30, cy); lto(centerX + 30, cy - boxH); lns.push("s");
    }

    // Left side: Client Info
    txt("To,", M + 10, cy - 15, "F2", 10);
    let clY = cy - 30;
    wrapClData.forEach(l => {
        if (l.isEmail) {
            const ew = l.t.length * l.s * 0.55;
            rg(0.0, 0.4, 0.8); // Blue for link
            txt(l.t, M + 10, clY, l.f, l.s);
            annots.push({ rect: [M + 10, clY - 2, M + 10 + ew, clY + 8], url: `mailto:${client.email}` });
            rg(0, 0, 0); // Restore black
        } else {
            txt(l.t, M + 10, clY, l.f, l.s);
        }
        clY -= 12;
    });

    // Right side: Invoice Info
    let ri = cy - 15;
    const rx = centerX + 40;
    txt(`Invoice No: ${inv.id}`, rx, ri, "F2", 10);
    txt(`Dt: ${inv.date}`, W - M - 70, ri, "F1", 9);
    ri -= 20;
    txt(`Your P.O No: ${inv.poNumber || "---"}`, rx, ri, "F1", 9);
    ri -= 20;
    txt(`Due Date: ${inv.due || inv.date}`, rx, ri, "F1", 9);

    const headerBottomLine = cy - boxH;

    // --- ITEMS TABLE (Grid with Vertical Dividers) ---
    cy = headerBottomLine - 20;
    const tableTop = cy;
    const headers = ["Sl.", "Particulars", "HSN/SAC", "Qty.", "Rate", "Tax", "Total"];
    const headerPos = [M + 5, M + 35, M + 215, M + 265, M + 305, M + 375, M + 435];

    // Shaded header box
    if (themeId === "minimal") {
        rg(0.7, 0.7, 0.7);
        move(M, cy); lto(W - M, cy); lns.push("s");
        move(M, cy - 20); lto(W - M, cy - 20); lns.push("s");
        rg(0.1, 0.1, 0.1);
    } else if (themeId === "bold") {
        rg(0.08, 0.25, 0.45); rc(M, cy - 20, W - 2 * M, 20); lns.push("f");
        rg(1, 1, 1);
    } else {
        rg(0.96, 0.96, 0.96); rc(M, cy - 20, W - 2 * M, 20); lns.push("f");
        rg(0, 0, 0); rc(M, cy - 20, W - 2 * M, 20); lns.push("s");
    }

    headers.forEach((h, i) => {
        txt(h, headerPos[i], cy - 14, "F2", 9);
    });

    cy -= 20;
    const gridStart = cy;

    const curSymbol = currency?.symbol || "₹";
    const isAsciiCur = /^[\x00-\x7F]*$/.test(curSymbol);
    const pdfCur = isAsciiCur ? curSymbol : (currency?.code || "INR");
    const fmt = (n) => `${pdfCur} ${(Number(n) || 0).toFixed(2)}`;

    // Calculate tax breakdown early
    const taxBreakdown = {};
    (inv.items || []).forEach(it => {
        getItemTaxList(it, taxRates).forEach(t => {
            const label = t.label || "Tax";
            taxBreakdown[label] = (taxBreakdown[label] || 0) + t.amount;
        });
    });

    const fmtNum = (n) => {
        try {
            return new Intl.NumberFormat(currency?.locale || "en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(Number(n) || 0);
        } catch (e) {
            return (Number(n) || 0).toFixed(2);
        }
    };

    // Items Rendering
    (inv.items || []).forEach((it, idx) => {
        rg(0.1, 0.1, 0.1);
        const wrappedDesc = getLines(it.desc || "---", 9, 175);
        const itemRows = Math.max(1, wrappedDesc.length);
        const rowH = 20 + ((itemRows - 1) * 12);

        txt(String(idx + 1), M + 10, cy - 14, "F1", 9);
        wrappedDesc.forEach((dl, di) => {
            txt(dl, M + 35, cy - 14 - (di * 12), "F1", 9);
        });
        txt(it.hsn || "---", M + 215, cy - 14, "F1", 8);
        rTxt(String(it.qty || 0), M + 295, cy - 14, "F1", 9, 35);
        rTxt(fmtNum(it.price), M + 365, cy - 14, "F1", 9, 65);

        const lineTax = itemTaxTotal(it, taxRates);
        rTxt(fmtNum(lineTax), M + 425, cy - 14, "F1", 9, 55);

        const lineTotal = (Number(it.qty || 0) * Number(it.price || 0)) + lineTax;
        rTxt(fmtNum(lineTotal), W - M - 5, cy - 14, "F2", 9, 100);

        cy -= rowH;
        // Horizontal cell divider (lighter)
        rg(0.9, 0.9, 0.9); move(M, cy); lto(W - M, cy); lns.push("s");
    });

    // Vertical dividers and borders for the table
    if (themeId === "minimal") {
        rg(0.7, 0.7, 0.7);
        move(M, cy); lto(W - M, cy); lns.push("s");
    } else if (themeId === "bold") {
        rg(0.8, 0.8, 0.85);
        [M + 30, M + 210, M + 260, M + 300, M + 370, M + 430].forEach(vx => {
            move(vx, tableTop); lto(vx, cy); lns.push("s");
        });
        rc(M, cy, W - 2 * M, gridStart - cy); lns.push("s");
    } else {
        rg(0, 0, 0);
        [M + 30, M + 210, M + 260, M + 300, M + 370, M + 430].forEach(vx => {
            move(vx, tableTop); lto(vx, cy); lns.push("s");
        });
        rc(M, cy, W - 2 * M, gridStart - cy); lns.push("s");
    }

    // --- TOTALS & BANK DETAILS ---
    let totalAreaY = cy - 20;

    const subtotalCost = total(inv.items);
    const taxGrandCol = (inv.items || []).reduce((s, it) => s + itemTaxTotal(it, taxRates), 0);
    const grandFinal = totalWithTax(inv.items, taxRates);

    // Bank Details (Left Side)
    if (seller.bankName) {
        let bY = totalAreaY;
        rg(0.1, 0.1, 0.1); txt("BANK DETAILS,", M, bY, "F2", 9); bY -= 12;
        const bw = centerX - 10 - M;
        const drawBankLine = (pre, val) => {
            if (!val) return;
            getLines(`${pre}${val}`, 8, bw).forEach(l => {
                txt(l, M, bY, "F1", 8); bY -= 10;
            });
        };
        drawBankLine("Bank: ", seller.bankName);
        drawBankLine("A/C No: ", seller.accountNumber);
        drawBankLine("IFSC: ", seller.ifscCode);
        drawBankLine("Branch: ", seller.branch);
    }

    // Totals (Right Side)
    const taxWidth = 180;
    const taxX = W - M - taxWidth;
    let ty = totalAreaY;
    const drawFinalTotalLine = (label, val, isGrand = false) => {
        if (isGrand) {
            if (themeId === "minimal") {
                rg(0.7, 0.7, 0.7);
                move(taxX, ty); lto(W - M, ty); lns.push("s");
                rg(0.1, 0.1, 0.1);
                txt(label, taxX + 10, ty - 12, "F2", 10);
                rTxt(val, W - M - 5, ty - 12, "F2", 10, 105);
                rg(0.7, 0.7, 0.7);
                move(taxX, ty - 16); lto(W - M, ty - 16); lns.push("s");
                move(taxX, ty - 18); lto(W - M, ty - 18); lns.push("s");
            } else if (themeId === "bold") {
                rg(0.08, 0.25, 0.45); rc(taxX, ty - 18, taxWidth, 22); lns.push("f");
                rg(1, 1, 1);
                txt(label, taxX + 10, ty - 12, "F2", 10);
                rTxt(val, W - M - 5, ty - 12, "F2", 10, 105);
            } else {
                rg(0.92, 0.92, 0.92); rc(taxX, ty - 18, taxWidth, 22); lns.push("f");
                rg(0, 0, 0);
                txt(label, taxX + 10, ty - 12, "F2", 10);
                rTxt(val, W - M - 5, ty - 12, "F2", 10, 105);
            }
        } else {
            rg(0.2, 0.2, 0.2); txt(label, taxX + 10, ty - 12, "F1", 9);
            rTxt(val, W - M - 5, ty - 12, "F1", 9, 105);
        }
        ty -= 18;
    };

    drawFinalTotalLine("Subtotal", fmtNum(subtotalCost));
    Object.entries(taxBreakdown).forEach(([label, amount]) => {
        drawFinalTotalLine(label, fmtNum(amount));
    });
    drawFinalTotalLine("Grand Total", fmtNum(grandFinal), true);

    // Partial payment summary (additive — only when something has been paid)
    const paidSoFar = Math.round((Number(inv.amountPaid) || 0) * 100) / 100;
    if (paidSoFar > 0) {
        drawFinalTotalLine("Amount Paid", fmtNum(paidSoFar));
        const balance = Math.round((grandFinal - paidSoFar) * 100) / 100;
        if (balance > 0) drawFinalTotalLine("Balance Due", fmtNum(balance), true);
        else drawFinalTotalLine("Paid in Full", fmtNum(0));
    }

    // Amount in Words (In a shaded box)
    const wordsText = `${(currency.code || "INR").toUpperCase()}: ${numberToWords(grandFinal, currency.code)}`;
    const wrappedWords = getLines(wordsText, 9, W - 2 * M - 20);
    const wordsBoxH = 20 + ((wrappedWords.length - 1) * 12);
    const wordsY = ty - 25;

    rg(0.98, 0.98, 0.98); rc(M, wordsY - wordsBoxH + 14, W - 2 * M, wordsBoxH); lns.push("f");
    rg(0.8, 0.8, 0.8); rc(M, wordsY - wordsBoxH + 14, W - 2 * M, wordsBoxH); lns.push("s");
    rg(0.1, 0.1, 0.1);
    wrappedWords.forEach((wl, wi) => {
        txt(wl, M + 10, wordsY + 2 - (wi * 12), "F2", 9);
    });

    // Terms and Signatory Section
    let footerY = wordsY - Math.max(40, wordsBoxH + 20);

    // Left: Terms & Conditions (Loop through all lines in termsList)
    const termsArr = seller?.termsList || [seller?.terms1, seller?.terms2, seller?.terms3].filter(t => t);
    const tcVerified = (termsArr || []).filter(t => typeof t === "string" && t.trim().length > 0);

    if (tcVerified.length > 0) {
        txt("Terms & Conditions:", M, footerY, "F2", 9);
        rg(0.4, 0.4, 0.4);
        let tcY = footerY - 12;
        tcVerified.slice(0, 6).forEach((l, i) => {
            const prefix = `${i + 1}. `;
            const wrapTerms = getLines(l, 7, (W / 2) - M);
            wrapTerms.forEach((wl, wi) => {
                txt(wi === 0 ? prefix + wl : "   " + wl, M, tcY, "F1", 7);
                tcY -= 10;
            });
        });
    }

    // Right: Authorized Signatory
    if (seller.signature || seller.signatoryName) {
        rg(0.1, 0.1, 0.1);
        const signX = W - M - 140;
        const bizNameForSign = seller.companyName || seller.name || "MY BUSINESS";

        getLines(`For ${bizNameForSign}`, 9, 140).forEach((wl, wi) => {
            txt(wl, signX, footerY - (wi * 11), "F2", 9);
        });

        // Push footerY down slightly for signature image to avoid overlap
        const sigData = await getQRImage(seller.signature);
        if (sigData && sigData.hex) {
            const aspect = sigData.w / sigData.h;
            let sigW = 120;
            let sigH = 120 / aspect;

            // Constrain constraints to max 35 height and 120 width
            if (sigH > 35) {
                sigH = 35;
                sigW = 35 * aspect;
            }
            if (sigW > 120) {
                sigW = 120;
                sigH = 120 / aspect;
            }

            // Center the signature horizontally over the line
            const offsetWidth = signX + Math.max(0, (140 - sigW) / 2);
            // Draw sitting 5pts precisely above the divider line for clarity
            lns.push(`q ${sigW} 0 0 ${sigH} ${offsetWidth} ${footerY - 55 + 5} cm /ImSig Do Q`);
        }

        rg(0.7, 0.7, 0.7); // Subtle line
        move(signX, footerY - 55); lto(W - M, footerY - 55); lns.push("s");
        rg(0.2, 0.2, 0.2);
        const signatoryName = seller.signatoryName || "Authorized Signatory";
        const signW = signatoryName.length * 8 * 0.55;
        // Center the authorizer name under the line
        txt(signatoryName, signX + (140 / 2) - (signW / 2), footerY - 67, "F2", 8);
    }

    // QR Code in bottom left corner absolute
    if (qrData && qrData.hex) {
        const qrSize = 100;
        lns.push(`q ${qrSize} 0 0 ${qrSize} ${M} 40 cm /Im1 Do Q`);
        txt(seller.qrLabel || (seller.upiId ? "Scan to Pay via UPI" : "Scan to Pay"), M, 30, "F2", 8);
    }

    // Branding at absolute bottom to avoid overlap
    rg(0.2, 0.2, 0.2);
    const brandingText = "Invoiced beautifully with Billit. Professional. Fast. Free.";
    const brandingWidth = brandingText.length * 6 * 0.5;
    // Moved to absolute bottom (20 units from page end)
    txt(brandingText, W - M - brandingWidth, 20, "F1", 6);

    return { stream: lns.join("\n"), annots, W, H };
};


export const getBatchPDF = async (invList, clients, seller, currency, taxRates, title = "INVOICE", plan = "free") => {
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

    const esc = (s) => String(s || "").replace(/[()\\]/g, (c) => "\\" + c);

    const pageIDs = [];
    for (let inv of invList) {
        const cl = clients.find(c => String(c.id) === String(inv.clientId));
        const { stream, annots, W, H } = await getInvoicePageStream(inv, cl, seller, currency, taxRates, title, plan);
        
        const xObjMap = {};
        const qrData = seller.qrCode ? await getQRImage(seller.qrCode) : null;
        const logoData = seller.logo ? await getQRImage(seller.logo) : null;
        const bizImgData = await getBizImage(seller.companyName || seller.name || "MY BUSINESS");
        const sigData = seller.signature ? await getQRImage(seller.signature) : null;

        if (qrData && qrData.hex) {
            const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${qrData.w} /Height ${qrData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${qrData.hex.length} >>\nstream\n${qrData.hex}\nendstream`);
            xObjMap["Im1"] = id;
        }
        if (logoData && logoData.hex) {
            const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${logoData.w} /Height ${logoData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${logoData.hex.length} >>\nstream\n${logoData.hex}\nendstream`);
            xObjMap["ImLogo"] = id;
        }
        if (bizImgData && bizImgData.hex) {
            const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${bizImgData.w} /Height ${bizImgData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${bizImgData.hex.length} >>\nstream\n${bizImgData.hex}\nendstream`);
            xObjMap["ImBiz"] = id;
        }
        if (sigData && sigData.hex) {
            const idS = addObj(`<< /Type /XObject /Subtype /Image /Width ${sigData.w} /Height ${sigData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${sigData.hex.length} >>\nstream\n${sigData.hex}\nendstream`);
            xObjMap["ImSig"] = idS;
        }

        const pageAnnots = [];
        (annots || []).forEach(a => {
            const id = addObj(`<< /Type /Annot /Subtype /Link /Rect [${a.rect.join(" ")}] /Border [0 0 0] /A << /S /URI /URI (${esc(a.url)}) >> >>`);
            pageAnnots.push(`${id} 0 R`);
        });

        const ctID = addObj(`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`);
        const xObjRes = Object.entries(xObjMap).map(([name, id]) => `/${name} ${id} 0 R`).join(" ");
        const annStr = pageAnnots.length ? `/Annots [${pageAnnots.join(" ")}]` : "";
        const pgID = addObj(`<< /Type /Page /Parent ${pagesID} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${ctID} 0 R ${annStr} /Resources << /Font << /F1 ${f1ID} 0 R /F2 ${f2ID} 0 R >> ${xObjRes ? `/XObject << ${xObjRes} >>` : ""} >> >>`);
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

export const getPDFData = async (inv, clients, seller, currency, taxRates, plan = "free") => {
    const pdf = await getBatchPDF([inv], clients, seller, currency, taxRates, "INVOICE", plan);
    return pdf.bytes;
};

export const getThermalInventoryPDFData = async (seller, currency, products, taxRates, title = "INVENTORY", defaultNote = "", plan = "free") => {
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

    const fmtNum = (n) => {
        try {
            return new Intl.NumberFormat(currency?.locale || "en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(Number(n) || 0);
        } catch (e) {
            return (Number(n) || 0).toFixed(2);
        }
    };

    products.forEach((p, idx) => {
        txt(String(idx + 1), M, cy, "F1", 7);
        txt(p.name.substring(0, 20).toUpperCase(), M + 15, cy, "F2", 7);
        const taxAmt = itemTaxTotal({ ...p, qty: 1, tax: p.tax || [] }, taxRates);
        const priceStr = fmtNum(Number(p.price || 0) + taxAmt);
        txt(priceStr, W - M - (priceStr.length * 7 * 0.55), cy, "F1", 7);
        cy -= 12;
        if (p.desc) {
            txt(p.desc.substring(0, 40), M + 15, cy, "F1", 6);
            cy -= 10;
        }
    });

    cy -= 5;
    line(M, cy, W - M); cy -= 15;
    const totalV = products.reduce((s, p) => {
        const taxAmt = itemTaxTotal({ ...p, qty: 1, tax: p.tax || [] }, taxRates);
        return s + Number(p.price || 0) + taxAmt;
    }, 0);
    const totStr = fmtNum(totalV);
    txt("STOCK VAL:", M, cy, "F2", 8);
    txt(totStr, W - M - (totStr.length * 8 * 0.55), cy, "F2", 8);

    cy -= 10;
    line(M, cy, W - M); cy -= 20;
    const endMsg = defaultNote || "Visit Again...";
    const ew = endMsg.substring(0, 40).length * 8 * 0.5;
    txt(endMsg.substring(0, 40), W / 2 - ew / 2, cy, "F1", 8);

    // Branding
    if (plan === "free") {
        rg(0.2, 0.2, 0.2);
        const brandingText = "Invoiced beautifully with Billit. Professional. Fast. Free.";
        const brandingWidth = brandingText.length * 6 * 0.5;
        txt(brandingText, W - M - brandingWidth, cy - 20, "F1", 6);
    }


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

export const getThermalInvoicePageStream = async (inv, clients, seller, currency, taxRates, defaultNote = "", plan = "free") => {
    const biz = seller?.name || "BILLIT";
    const isBizAscii = /^[\x00-\x7F]*$/.test(biz);

    let itemH = inv.items.length * 12;
    const bizH = 70 + (seller?.email ? 10 : 0) + (seller?.phone ? 10 : 0) + (seller?.address ? 10 : 0) + (seller?.gstin ? 10 : 0);
    const client = clients?.find(c => String(c.id) === String(inv.clientId));
    const clientH = client ? 15 : 0;
    const bankH = 0; // Removed bank details for thermal
    const W = 226, H = bizH + itemH + clientH + 240 + bankH, M = 10;
    const curSymbol = currency?.symbol || "$";
    const isAscii = /^[\x00-\x7F]*$/.test(curSymbol);
    const pdfCur = isAscii ? curSymbol : (currency?.code || "INR");

    let lns = [];
    const esc = (s) => String(s || "").replace(/[()\\]/g, (c) => "\\" + c);
    const txt = (t, x, y, f, s) => { lns.push("BT", `/${f} ${s} Tf`, `${(Number(x) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} Td`, `(${esc(t)}) Tj`, "ET"); };
    const rg = (r, g, b) => lns.push(`${(Number(r) || 0).toFixed(3)} ${(Number(g) || 0).toFixed(3)} ${(Number(b) || 0).toFixed(3)} rg`);
    const line = (x1, y, x2) => lns.push(`${(Number(x1) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} m ${(Number(x2) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} l s`);
    const rTxt = (t, rightX, y, f, defaultSize, maxW) => {
        const estW = String(t).length * defaultSize * 0.55;
        let s = defaultSize;
        let finalW = estW;
        if (estW > maxW) {
            s = Math.max(5, maxW / (String(t).length * 0.55));
            finalW = maxW;
        }
        txt(t, rightX - finalW, y, f, s);
    };

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
    rTxt("Qty", W - M - 105, cy, "F2", 8, 20);
    rTxt("Rate", W - M - 62, cy, "F2", 8, 40);
    rTxt("Tax", W - M - 32, cy, "F2", 8, 30);
    rTxt("Amount", W - M, cy, "F2", 8, 40); cy -= 12;
    line(M, cy, W - M); cy -= 15;

    const fmtNum = (n) => {
        try {
            return new Intl.NumberFormat(currency?.locale || "en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(Number(n) || 0);
        } catch (e) {
            return (Number(n) || 0).toFixed(2);
        }
    };

    inv.items.forEach(it => {
        txt(it.desc.substring(0, 14), M, cy, "F1", 8);
        rTxt(String(it.qty), W - M - 105, cy, "F1", 8, 20);
        rTxt(fmtNum(it.price), W - M - 62, cy, "F1", 8, 40);
        const lineTax = itemTaxTotal(it, taxRates);
        rTxt(fmtNum(lineTax), W - M - 32, cy, "F1", 8, 30);
        const lineTotal = (Number(it.qty || 0) * Number(it.price || 0)) + lineTax;
        rTxt(fmtNum(lineTotal), W - M, cy, "F1", 8, 40);
        cy -= 12;
    });

    cy -= 10;
    line(M, cy, W - M); cy -= 15;
    const sub = Number(total(inv.items)) || 0;
    // Totals section for thermal
    const totalQty = (inv.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);
    txt("Total Qty :", M, cy, "F1", 9);
    txt(String(totalQty), W - M - (String(totalQty).length * 9 * 0.55), cy, "F1", 9);
    cy -= 12;

    const subVal = fmtNum(sub);
    txt("Sub Total :", M, cy, "F1", 9);
    txt(subVal, W - M - (subVal.length * 9 * 0.55), cy, "F1", 9);
    cy -= 12;

    const taxBreakdown = {};
    (inv.items || []).forEach(it => {
        getItemTaxList(it, taxRates).forEach(t => {
            const key = `${t.label} (${t.rate}%)`;
            taxBreakdown[key] = (taxBreakdown[key] || 0) + t.amount;
        });
    });

    Object.entries(taxBreakdown).forEach(([label, amount]) => {
        const amtStr = fmtNum(amount);
        const lblStr = `${label} :`;
        txt(lblStr, M, cy, "F1", 8);
        txt(amtStr, W - M - (amtStr.length * 8 * 0.55), cy, "F1", 8);
        cy -= 10;
    });

    cy -= 5;

    line(M, cy, W - M); cy -= 20;

    const grandVal = totalWithTax(inv.items, taxRates);
    const grand = fmtNum(grandVal);
    txt("Total :", M, cy, "F2", 12);
    txt(grand, W - M - (grand.length * 12 * 0.55), cy, "F2", 12); cy -= 30;

    // Partial payment summary (additive — only when something has been paid)
    const paidSoFarT = Math.round((Number(inv.amountPaid) || 0) * 100) / 100;
    if (paidSoFarT > 0) {
        const paidStr = fmtNum(paidSoFarT);
        txt("Paid :", M, cy, "F2", 10);
        txt(paidStr, W - M - (paidStr.length * 10 * 0.55), cy, "F2", 10); cy -= 16;
        const balT = Math.round((grandVal - paidSoFarT) * 100) / 100;
        if (balT > 0) {
            const balStr = fmtNum(balT);
            txt("Balance :", M, cy, "F2", 10);
            txt(balStr, W - M - (balStr.length * 10 * 0.55), cy, "F2", 10); cy -= 16;
        } else {
            txt("Paid in Full", M, cy, "F2", 10); cy -= 16;
        }
    }

    cy -= 10;

    const endMsg = defaultNote || "Thank You Visit Again...";
    const ew = endMsg.substring(0, 45).length * 8 * 0.5;
    txt(endMsg.substring(0, 45), W / 2 - ew / 2, cy, "F1", 8);

    // Branding
    if (plan === "free") {
        rg(0.2, 0.2, 0.2);
        const brandingText = "Invoiced beautifully with Billit. Professional. Fast. Free.";
        const brandingWidth = brandingText.length * 6 * 0.5;
        txt(brandingText, W - M - brandingWidth, cy - 12, "F1", 6);
    }
    return { stream: lns.join("\n"), W, H };
};

export const getBatchThermalPDF = async (invList, clients, seller, currency, taxRates, defaultNote = "", plan = "free") => {
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
        const { stream, W, H } = await getThermalInvoicePageStream(inv, clients, seller, currency, taxRates, defaultNote, plan);
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

export const getThermalPDFData = async (inv, clients, seller, currency, taxRates, defaultNote = "", plan = "free") => {
    const pdf = await getBatchThermalPDF([inv], clients, seller, currency, taxRates, defaultNote, plan);
    return pdf.bytes;
};

export const getLetterPages = async (content, client, seller, subject = "COMMUNICATION", plan = "free") => {
    const W = 595, H = 842, M = 55;
    const lns = []; const annots = [];
    const esc = (s) => String(s || "").replace(/[()\\]/g, (c) => "\\" + c);
    const txt = (t, x, y, f, s) => { lns.push("BT", `/${f} ${s} Tf`, `${(Number(x) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} Td`, `(${esc(t)}) Tj`, "ET"); };
    const rg = (r, g, b) => lns.push(`${(Number(r) || 0).toFixed(3)} ${(Number(g) || 0).toFixed(3)} ${(Number(b) || 0).toFixed(3)} rg`);
    const move = (x, y) => lns.push(`${(Number(x) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} m`);
    const lto = (x, y) => lns.push(`${(Number(x) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} l`);
    const rc = (x, y, w, h) => lns.push(`${(Number(x) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} ${(Number(w) || 0).toFixed(2)} ${(Number(h) || 0).toFixed(2)} re`);

    const getLines = (text, size, maxWidth) => {
        const words = text.split(/\s+/);
        const lines = []; let currentLine = "";
        const charWidth = size * 0.55; 
        words.forEach(word => {
            const wordWidth = word.length * charWidth;
            const currentLineWidth = currentLine.length * charWidth;
            if (currentLineWidth + wordWidth > maxWidth && currentLine) {
                lines.push(currentLine.trim()); currentLine = word + " ";
            } else { currentLine += word + " "; }
        });
        if (currentLine) lines.push(currentLine.trim());
        return lines;
    };

    let cy = H - M - 20;

    // Header - Professional Letterhead style
    rg(0, 0, 0); txt(seller.companyName || seller.name || "MY BUSINESS", M, cy, "F2", 14); cy -= 18;
    rg(0.4, 0.4, 0.4);
    if (seller.address) txt(seller.address.substring(0, 80), M, cy, "F1", 9); cy -= 12;
    if (seller.email || seller.phone) txt(`${seller.email || ""} | ${seller.phone || ""}`, M, cy, "F1", 9); cy -= 30;

    rg(0.8, 0.8, 0.8); move(M, cy + 10); lto(W - M, cy + 10); lns.push("s"); cy -= 10;

    // Date & Recipient
    rg(0.1, 0.1, 0.1); txt(`Date: ${new Date().toLocaleDateString()}`, M, cy, "F1", 10); cy -= 25;
    
    txt("To,", M, cy, "F1", 10); cy -= 15;
    txt(client.name || "Recipient", M, cy, "F2", 11); cy -= 12;
    if (client.address) {
        getLines(client.address, 10, W - 2 * M).forEach(l => {
            txt(l, M, cy, "F1", 10); cy -= 12;
        });
    }

    cy -= 30;
    // Subject
    rg(0, 0, 0); txt(`Subject: ${subject.toUpperCase()}`, M, cy, "F2", 11); cy -= 30;

    // Content
    rg(0.1, 0.1, 0.1);
    const paragraphs = content.split('\n');
    paragraphs.forEach(para => {
        if (!para.trim()) { cy -= 10; return; }
        const wrapped = getLines(para.trim(), 10, W - 2 * M);
        wrapped.forEach(l => {
            txt(l, M, cy, "F1", 11); cy -= 15;
            if (cy < M + 50) { /* should handle page break but for mvv one page */ }
        });
        cy -= 10;
    });

    // Closing
    cy -= 30;
    txt("Truly,", M, cy, "F1", 11); cy -= 40;
    txt(seller.signatoryName || seller.name || "Authorized Person", M, cy, "F2", 11); cy -= 12;
    rg(0.4, 0.4, 0.4); txt(seller.companyName || seller.name || "My Business", M, cy, "F1", 9);

    // Branding
    if (plan === "free") {
        rg(0.2, 0.2, 0.2);
        const brandingText = "Document generated with Billit. Professional. Fast. Free.";
        const brandingWidth = brandingText.length * 6 * 0.5;
        txt(brandingText, W - M - brandingWidth, 30, "F1", 6);
    }

    return [{ stream: lns.join("\n"), annots, W, H }];
};

export const getLetterPDF = async (content, client, seller, subject, plan = "free") => {
    const pages = await getLetterPages(content, client, seller, subject, plan);
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
    const pageIDs = [];
    for (let pg of pages) {
        const ctID = addObj(`<< /Length ${new TextEncoder().encode(pg.stream).length} >>\nstream\n${pg.stream}\nendstream`);
        const pgID = addObj(`<< /Type /Page /Parent ${pagesID} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${ctID} 0 R /Resources << /Font << /F1 ${f1ID} 0 R /F2 ${f2ID} 0 R >> >> >>`);
        pageIDs.push(pgID);
    }
    objects[1].data = new TextEncoder().encode(`<< /Type /Pages /Kids [${pageIDs.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIDs.length} >>`);
    const enc = new TextEncoder();
    let pdfParts = [enc.encode("%PDF-1.4\n")];
    const offs = [];
    objects.forEach(o => {
        offs.push(pdfParts.reduce((a, b) => a + b.length, 0));
        pdfParts.push(enc.encode(`${o.num} 0 obj\n`), o.data, enc.encode("\nendobj\n"));
    });
    const xOff = pdfParts.reduce((a, b) => a + b.length, 0);
    pdfParts.push(enc.encode(`xref\n0 ${objCount + 1}\n0000000000 65535 f \n`));
    offs.forEach(o => pdfParts.push(enc.encode(`${String(o).padStart(10, "0")} 00000 n \n`)));
    pdfParts.push(enc.encode(`trailer << /Size ${objCount + 1} /Root ${catID} 0 R >>\nstartxref\n${xOff}\n%%EOF\n`));
    const finalPdf = new Uint8Array(pdfParts.reduce((a, b) => a + b.length, 0));
    let curIdx = 0; pdfParts.forEach(p => { finalPdf.set(p, curIdx); curIdx += p.length; });
    const blob = new Blob([finalPdf], { type: "application/pdf" });
    return { bytes: finalPdf, blob, url: URL.createObjectURL(blob) };
};
