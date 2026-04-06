import { total, getItemTaxList, itemTaxTotal, totalWithTax, formatCurrency } from "./calculations";
import { getProductImage } from "./db";
import { numberToWords } from "./numWords";

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

    // White background - removed dark rectangle fill

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
    // Standardized Header Order: Address first, then Location URL, then Contact
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
                // Split email and phone if they are on the same line to only link the email
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
                        txt(emailValue, currentX, docY, "F1", 8);
                        addAnnot([currentX, docY - 2, currentX + ew, docY + 8], `mailto:${emailValue}`);
                        currentX += ew;
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

    const displayTitle = (title || "INVENTORY LIST").toUpperCase();
    const titleWidth = displayTitle.length * 14 * 0.5;
    rg(0.4, 0.4, 0.4); txt(displayTitle, W / 2 - (titleWidth / 2), docY, "F1", 14);
    docY -= 20;

    rg(0.9, 0.9, 0.9); lns.push(`${M} ${docY} m ${W - M} ${docY} l s`);

    let cy = docY - 45;
    const tableTop = cy + 15;
    rg(0.1, 0.1, 0.1);
    txt("S.No", M + 5, cy, "F2", 9);
    txt("ITEM NAME", M + 45, cy, "F2", 9);
    txt("TOTAL PRICE (INCL. TAX)", W - M - 140, cy, "F2", 9);
    rg(0.85, 0.85, 0.85); lns.push(`${M} ${cy - 10} m ${W - M} ${cy - 10} l s`);
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
        const nameX = M + 45;

        rg(0.4, 0.4, 0.4); txt(`${i + 1}`, M + 5, cy, "F1", 9);

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

        if (curImgData) {
            const curSize = 11;
            lns.push(`q ${curSize} 0 0 ${curSize} ${W - M - 142} ${cy + (p.desc ? (lineCount * 9) : 0) - 1} cm /ImCur Do Q`);
            rTxt(fmtNum(totalPrice), W - M - 5, cy + (p.desc ? (lineCount * 9) : 0), "F2", 11, 130);
        } else {
            rTxt(`${pdfCur} ${fmtNum(totalPrice)}`, W - M - 5, cy + (p.desc ? (lineCount * 9) : 0), "F2", 11, 140);
        }
        rg(0.9, 0.9, 0.9); lns.push(`${M} ${cy - 5} m ${W - M} ${cy - 5} l s`);
        cy -= 45;
        if (cy < M + 140) break;
    }

    const tableBottom = cy + 40;
    rg(0.85, 0.85, 0.85);
    lns.push(`${M} ${tableTop} m ${M} ${tableBottom} l s`);            // Left
    lns.push(`${M + 40} ${tableTop} m ${M + 40} ${tableBottom} l s`);    // Divider 1
    lns.push(`${W - M - 150} ${tableTop} m ${W - M - 150} ${tableBottom} l s`); // Divider 2
    lns.push(`${W - M} ${tableTop} m ${W - M} ${tableBottom} l s`);      // Right
    lns.push(`${M} ${tableTop} m ${W - M} ${tableTop} l s`);             // Top
    // Bottom border is provided by the last row's divider line

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

    // Branding at bottom
    rg(0.6, 0.6, 0.6);
    const brandingText = "Generated with Billit. Professional. Fast. Free.";
    const brandingWidth = brandingText.length * 7 * 0.5;
    txt(brandingText, W - M - brandingWidth, 20, "F1", 7);

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

export const getClientListPDFData = async (seller, clients, invoices, taxRates, currency) => {
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
                        txt(emailValue, currentX, docY, "F1", 8);
                        addAnnot([currentX, docY - 2, currentX + ew, docY + 8], `mailto:${emailValue}`);
                        currentX += ew;
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

    const colWidths = [40, 200, 100, 100, 115]; // SNo, Name, Email, Phone, Balance/Total
    const colX = [M, M + 40, M + 240, M + 340, M + 440];
    
    clients.forEach((c, idx) => {
        if (cy < M + 50) return;
        rg(0.9, 0.9, 0.9); lns.push(`${M} ${cy - 5} m ${W - M} ${cy - 5} l s`);
        rg(0.4, 0.4, 0.4); txt(`${idx + 1}`, M + 5, cy, "F1", 9);
        rg(0.1, 0.1, 0.1); 
        const nameLines = getLines(c.name || "N/A", 10, 190);
        nameLines.forEach((nl, ni) => {
            txt(nl, M + 45, cy - (ni * 11), "F2", ni === 0 ? 10 : 8);
        });
        
        rg(0.4, 0.4, 0.4);
        txt(String(c.phone || "").substring(0, 15), M + 345, cy, "F1", 8);
        
        // Let's add client email if it fits
        if (c.email) {
            const emLines = getLines(c.email, 8, 90);
            emLines.forEach((el, ei) => {
                const ty = cy - (ei * 9);
                const ew = el.length * 8 * 0.5;
                rg(0.4, 0.4, 0.4);
                txt(el, M + 245, ty, "F1", 8);
                addAnnot([M + 245, ty - 2, M + 245 + ew, ty + 8], `mailto:${c.email}`);
            });
        }

        const clientInvoices = (invoices || []).filter(inv => String(inv.clientId) === String(c.id));
        const totalBilled = clientInvoices.reduce((acc, inv) => acc + totalWithTax(inv.items, taxRates), 0);
        rTxt(`${pdfCur} ${totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, W - M - 5, cy, "F2", 9, 110);

        cy -= Math.max(25, (nameLines.length * 11) + 5);
    });

    const tableBottom = cy + 20;
    rg(0.85, 0.85, 0.85);
    lns.push(`${M} ${tableTop} m ${M} ${tableBottom} l s`);
    lns.push(`${M + 40} ${tableTop} m ${M + 40} ${tableBottom} l s`);
    lns.push(`${M + 240} ${tableTop} m ${M + 240} ${tableBottom} l s`);
    lns.push(`${M + 340} ${tableTop} m ${M + 340} ${tableBottom} l s`);
    lns.push(`${M + 440} ${tableTop} m ${M + 440} ${tableBottom} l s`);
    lns.push(`${W - M} ${tableTop} m ${W - M} ${tableBottom} l s`);
    lns.push(`${M} ${tableTop} m ${W - M} ${tableTop} l s`);

    rg(0.6, 0.6, 0.6);
    const brandingText = "Generated with Billit. Professional. Fast. Free.";
    const brandingWidth = brandingText.length * 7 * 0.5;
    txt(brandingText, W - M - brandingWidth, 20, "F1", 7);

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

export const getInvoicePageStream = async (inv, client, seller, currency, taxRates, title = "INVOICE") => {
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
            s = maxW / (String(t).length * 0.6);
            finalW = maxW;
        }
        txt(t, rightX - finalW, y, f, s);
    };
    const rc = (x, y, w, h) => lns.push(`${(Number(x) || 0).toFixed(2)} ${(Number(y) || 0).toFixed(2)} ${(Number(w) || 0).toFixed(2)} ${(Number(h) || 0).toFixed(2)} re`);
    const fl = () => lns.push("f"); const rg = (r, g, b) => lns.push(`${(Number(r) || 0).toFixed(3)} ${(Number(g) || 0).toFixed(3)} ${(Number(b) || 0).toFixed(3)} rg`);

    const qrData = seller.qrCode ? await getQRImage(seller.qrCode) : null;
    const logoData = seller.logo ? await getQRImage(seller.logo) : null;
    let bizImgData = null;
    let curImgYellowData = null;
    const centerX = W / 2;

    // Removed dark header background


    // Section 1: Business Identification (Refined Proforma Style)
    // Header Details
    let bizY = H - 35;

    // Top Row: GSTIN (Right)
    rg(0, 0, 0);
    const gstStr = seller.gstin ? `GSTIN: ${seller.gstin}` : "";
    if (gstStr) txt(gstStr, W - M - (gstStr.length * 8 * 0.5), H - 35, "F2", 8);

    // Business Logo (Always left of header)
    if (logoData && logoData.hex) {
        const logoSize = 55;
        lns.push(`q ${logoSize} 0 0 ${logoSize} ${M} ${H - M - logoSize} cm /ImLogo Do Q`);
        const lName = seller.logoName;
        if (lName) {
            const lw = lName.length * 7 * 0.5;
            rg(0.4, 0.4, 0.4); txt(lName, M + (logoSize / 2) - (lw / 2), H - M - logoSize - 10, "F2", 7);
        }
    }

    // Document Title (INVOICE) Above Business Name
    const docTitle = (title || "INVOICE").toUpperCase();
    rg(0.4, 0.4, 0.4);
    const docW = docTitle.length * 14 * 0.55;
    txt(docTitle, centerX - (docW / 2), bizY, "F2", 14);
    bizY -= 28;

    // Business Details (Centered)
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

    // ISO & Address lines (Centered) - Standardized Order
    rg(0.3, 0.3, 0.3);
    const details = [
        seller.description,
        seller.address,
        seller.locationUrl, // URL After Address
        [seller.email, seller.phone && `Phone: ${seller.phone}`].filter(Boolean).join(" | ")
    ].filter(Boolean);

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
                        const labelPart = "Email: ";
                        txt(labelPart, currentX, bizY, "F1", 8);
                        currentX += labelPart.length * 8 * 0.5;

                        const emailValue = seller.email;
                        const ew = emailValue.length * 8 * 0.6;
                        txt(emailValue, currentX, bizY, "F1", 8);
                        annots.push({ rect: [currentX, bizY - 2, currentX + ew, bizY + 8], url: `mailto:${emailValue}` });
                        currentX += ew;
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

    // Prepare Left side Client Info
    const clDataProps = [
        { t: client?.name || "Customer", f: "F2", s: 9 },
        { t: client?.email, f: "F1", s: 9 },
        { t: client?.phone, f: "F1", s: 9 },
        { t: client?.address, f: "F1", s: 9 },
        { t: client?.gstin && `Party's GST No: ${client.gstin}`, f: "F1", s: 9 }
    ].filter(i => Boolean(i.t));

    const maxClientW = (centerX + 30) - (M + 15);
    const wrapClData = [];
    clDataProps.forEach(d => {
        getLines(d.t, d.s, maxClientW).forEach(l => wrapClData.push({ t: l, f: d.f, s: d.s }));
    });

    // --- SUB-HEADER (The Boxed Section) ---
    let cy = bizY - 15;
    const boxH = Math.max(90, (wrapClData.length + 1) * 12 + 20); // Dynamic height to prevent clipping

    rg(0, 0, 0);
    // Outer Border
    rc(M, cy - boxH, W - 2 * M, boxH); lns.push("s");
    // Vertical Divider (Middle-ish)
    move(centerX + 30, cy); lto(centerX + 30, cy - boxH); lns.push("s");

    // Left side: Client Info
    txt("To,", M + 10, cy - 15, "F2", 10);
    let clY = cy - 30;
    wrapClData.forEach(l => {
        if (l.t === client?.email && client?.email) {
            const ew = l.t.length * l.s * 0.5;
            rg(0, 0, 0); // Black for client info
            txt(l.t, M + 10, clY, l.f, l.s);
            annots.push({ rect: [M + 10, clY - 2, M + 10 + ew, clY + 8], url: `mailto:${client.email}` });
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
    const headers = ["Sl.", "Particulars", "HSN/SAC", "Qty.", "Rate", "Total"];
    const headerPos = [M + 5, M + 35, M + 235, M + 295, M + 345, M + 435];

    // Shaded header box
    rg(0.96, 0.96, 0.96); rc(M, cy - 20, W - 2 * M, 20); lns.push("f");
    rg(0, 0, 0); rc(M, cy - 20, W - 2 * M, 20); lns.push("s");

    headers.forEach((h, i) => {
        txt(h, headerPos[i], cy - 14, "F2", 9);
    });

    cy -= 20;
    const gridStart = cy;

    const curSymbol = currency?.symbol || "₹";
    const isAsciiCur = /^[\x00-\x7F]*$/.test(curSymbol);
    const pdfCur = isAsciiCur ? curSymbol : (currency?.code || "INR");
    const curImgData = !isAsciiCur ? await getCurrencySymbolImage(curSymbol) : null;
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
        const wrappedDesc = getLines(it.desc || "---", 9, 180);
        const itemRows = Math.max(1, wrappedDesc.length);
        const rowH = 20 + ((itemRows - 1) * 12);

        txt(String(idx + 1), M + 10, cy - 14, "F1", 9);
        wrappedDesc.forEach((dl, di) => {
            txt(dl, M + 35, cy - 14 - (di * 12), "F1", 9);
        });
        txt(it.hsn || "---", M + 235, cy - 14, "F1", 8);
        rTxt(String(it.qty || 0), M + 335, cy - 14, "F1", 9, 40);
        rTxt(fmtNum(it.price), M + 425, cy - 14, "F1", 9, 80);

        const lineTax = itemTaxTotal(it, taxRates);
        const lineTotal = (Number(it.qty || 0) * Number(it.price || 0)) + lineTax;
        rTxt(fmtNum(lineTotal), W - M - 5, cy - 14, "F2", 9, 80);

        cy -= rowH;
        // Horizontal cell divider (lighter)
        rg(0.9, 0.9, 0.9); move(M, cy); lto(W - M, cy); lns.push("s");
    });

    // Vertical dividers for the table
    rg(0, 0, 0);
    [M + 30, M + 230, M + 290, M + 340, M + 430].forEach(vx => {
        move(vx, tableTop); lto(vx, cy); lns.push("s");
    });
    // Outer border of the item list
    rc(M, cy, W - 2 * M, gridStart - cy); lns.push("s");

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
            rg(0.92, 0.92, 0.92); rc(taxX, ty - 18, taxWidth, 22); lns.push("f");
            rg(0, 0, 0); txt(label, taxX + 10, ty - 12, "F2", 10);
            rTxt(val, W - M - 5, ty - 12, "F2", 10, 105);
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
    drawFinalTotalLine("Tax Total", fmtNum(taxGrandCol));
    drawFinalTotalLine("Grand Total", fmtNum(grandFinal), true);

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
        txt(seller.qrLabel || "Scan to Pay", M, 30, "F2", 8);
    }

    // Branding at absolute bottom to avoid overlap
    rg(0.2, 0.2, 0.2);
    const brandingText = "Invoiced beautifully with Billit. Professional. Fast. Free.";
    const brandingWidth = brandingText.length * 6 * 0.5;
    // Moved to absolute bottom (20 units from page end)
    txt(brandingText, W - M - brandingWidth, 20, "F1", 6);

    return { stream: lns.join("\n"), annots, W, H };
};


export const getBatchPDF = async (invList, clients, seller, currency, taxRates, title = "INVOICE") => {
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
        const { stream, annots, W, H } = await getInvoicePageStream(inv, cl, seller, currency, taxRates, title);
        
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

export const getPDFData = async (inv, clients, seller, currency, taxRates) => {
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
    rg(0.2, 0.2, 0.2);
    const brandingText = "Invoiced beautifully with Billit. Professional. Fast. Free.";
    const brandingWidth = brandingText.length * 6 * 0.5;
    txt(brandingText, W - M - brandingWidth, cy - 20, "F1", 6);


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
        txt(it.desc.substring(0, 20), M, cy, "F1", 8);
        txt(String(it.qty), W - M - 78, cy, "F1", 8);
        txt(fmtNum(it.price), W - M - 58, cy, "F1", 8);
        const lineTax = itemTaxTotal(it, taxRates);
        const lineTotal = (Number(it.qty || 0) * Number(it.price || 0)) + lineTax;
        txt(fmtNum(lineTotal), W - M - 30, cy, "F1", 8);
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

    const taxGrandVal = (inv.items || []).reduce((s, it) => s + itemTaxTotal(it, taxRates), 0);
    const taxGrand = fmtNum(taxGrandVal);
    txt("Tax Total :", M, cy, "F1", 9);
    txt(taxGrand, W - M - (taxGrand.length * 9 * 0.55), cy, "F1", 9);
    cy -= 15;

    line(M, cy, W - M); cy -= 20;

    const grandVal = totalWithTax(inv.items, taxRates);
    const grand = fmtNum(grandVal);
    txt("Total :", M, cy, "F2", 12);
    txt(grand, W - M - (grand.length * 12 * 0.55), cy, "F2", 12); cy -= 30;

    cy -= 10;

    const endMsg = defaultNote || "Thank You Visit Again...";
    const ew = endMsg.substring(0, 45).length * 8 * 0.5;
    txt(endMsg.substring(0, 45), W / 2 - ew / 2, cy, "F1", 8);

    // Branding
    rg(0.2, 0.2, 0.2);
    const brandingText = "Invoiced beautifully with Billit. Professional. Fast. Free.";
    const brandingWidth = brandingText.length * 6 * 0.5;
    txt(brandingText, W - M - brandingWidth, cy - 12, "F1", 6);
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
