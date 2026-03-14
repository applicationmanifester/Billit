import { total, getItemTaxList, itemTaxTotal, totalWithTax, formatCurrency } from "./calculations";

const hexMap = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0').toUpperCase());

const getQRImage = (dataUrl) => {
    return new Promise((resolve) => {
        if (!dataUrl) return resolve(null);
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
            for (let i = 0, k = 0; i < data.length; i += 4) {
                parts[k++] = hexMap[data[i]];
                parts[k++] = hexMap[data[i + 1]];
                parts[k++] = hexMap[data[i + 2]];
            }
            resolve({ hex: parts.join('') + ">", w: canvas.width, h: canvas.height });
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
    });
};

export const getInventoryPDFData = async (seller, currency, products) => {
    const biz = seller?.name || "BILLIT";
    const W = 595, H = 842, M = 40;
    const esc = (s) => String(s || "").replace(/[()\\]/g, (c) => "\\" + c);

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
    const pagesID = addObj(""); // Placeholder for Pages
    const f1ID = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const f2ID = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    const qrData = seller.qrCode ? await getQRImage(seller.qrCode) : null;
    const logoData = seller.logo ? await getQRImage(seller.logo) : null;

    const prodImages = await Promise.all(products.map(async p => {
        if (p.image) {
            const data = await getQRImage(p.image);
            return { id: p.id, data };
        }
        return { id: p.id, data: null };
    }));

    let lns = [];
    const txt = (t, x, y, f, s) => { lns.push("BT", `/${f} ${s} Tf`, `${x.toFixed(2)} ${y.toFixed(2)} Td`, `(${esc(t)}) Tj`, "ET"); };
    const rc = (x, y, w, h) => lns.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    const fl = () => lns.push("f"); const rg = (r, g, b) => lns.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);

    const xObjMap = {};
    if (logoData) {
        const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${logoData.w} /Height ${logoData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${logoData.hex.length} >>\nstream\n${logoData.hex}\nendstream`);
        xObjMap["ImLogo"] = id;
    }
    if (qrData) {
        const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${qrData.w} /Height ${qrData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${qrData.hex.length} >>\nstream\n${qrData.hex}\nendstream`);
        xObjMap["ImQR"] = id;
    }

    rg(0.059, 0.059, 0.098); rc(0, H - 120, W, 120); fl();
    let xLogoOffset = M;
    if (logoData) {
        const imgSize = 50;
        lns.push(`q ${imgSize} 0 0 ${imgSize} ${M} ${H - 65} cm /ImLogo Do Q`);
        xLogoOffset += 60;
    }
    rg(0.961, 0.784, 0.259); txt("INVENTORY LIST", xLogoOffset, H - 70, "F2", 24);
    rg(0.62, 0.604, 0.678); txt(biz.toUpperCase(), xLogoOffset, H - 90, "F1", 10);

    let cy = H - 180;
    rg(0.95, 0.95, 0.95); rc(M, cy - 5, W - M * 2, 20); fl();
    rg(0.2, 0.2, 0.2); txt("ITEM NAME", M + 5, cy, "F2", 9); txt("PRICE", W - M - 100, cy, "F2", 9);
    cy -= 30;

    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const pImg = prodImages.find(img => img.id === p.id);
        let xOffset = M + 5;
        if (pImg && pImg.data) {
            const imgName = `ImP${i}`;
            const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${pImg.data.w} /Height ${pImg.data.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${pImg.data.hex.length} >>\nstream\n${pImg.data.hex}\nendstream`);
            xObjMap[imgName] = id;
            const imgSize = 25;
            lns.push(`q ${imgSize} 0 0 ${imgSize} ${xOffset} ${cy - 5} cm /${imgName} Do Q`);
            xOffset += 35;
        }
        rg(0.3, 0.3, 0.3); txt(p.name || "", xOffset, cy, "F1", 11);
        txt(`${pdfCur} ${Number(p.price || 0).toFixed(2)}`, W - M - 100, cy, "F2", 11);
        cy -= 35;
        if (cy < M + 100) break; // Simplified paging
    }

    if (qrData) {
        const qrSize = 120;
        const qrY = cy > M + qrSize + 20 ? cy - qrSize - 20 : M + 20;
        rg(0.95, 0.95, 0.95); rc(M, qrY, qrSize + 10, qrSize + 10); fl();
        lns.push(`q ${qrSize} 0 0 ${qrSize} ${M + 5} ${qrY + 5} cm /ImQR Do Q`);
        rg(0.4, 0.4, 0.4);
        txt("PAYMENT QR", M + qrSize + 20, qrY + 80, "F2", 12);
        txt("SCAN TO PAY", M + qrSize + 20, qrY + 60, "F1", 10);
    }

    const stream = lns.join("\n");
    const ctID = addObj(`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`);
    const xObjRes = Object.entries(xObjMap).map(([name, id]) => `/${name} ${id} 0 R`).join(" ");
    const pgID = addObj(`<< /Type /Page /Parent ${pagesID} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${ctID} 0 R /Resources << /Font << /F1 ${f1ID} 0 R /F2 ${f2ID} 0 R >> ${xObjRes ? `/XObject << ${xObjRes} >>` : ""} >> >>`);

    objects[1].data = new TextEncoder().encode(`<< /Type /Pages /Kids [${pgID} 0 R] /Count 1 >>`);

    let pdf = "%PDF-1.1\n";
    const xrefs = [];
    objects.forEach(o => { xrefs.push(pdf.length); pdf += `${o.num} 0 obj\n${new TextDecoder("utf-8").decode(o.data)}\nendobj\n`; });
    const startXref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f\n`;
    xrefs.forEach(x => { pdf += `${String(x).padStart(10, "0")} 00000 n\n`; });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catID} 0 R >>\nstartxref\n${startXref}\n%%EOF`;
    return new TextEncoder().encode(pdf);
};

export const getInvoicePageStream = async (inv, client, seller, currency, taxRates) => {
    const biz = seller?.name || "BILLIT";
    const W = 850, H = 1600, M = 60;
    const esc = (s) => String(s || "").replace(/[()\\]/g, (c) => "\\" + c);
    let lns = [];
    const move = (x, y) => lns.push(`${x.toFixed(2)} ${y.toFixed(2)} m`);
    const lto = (x, y) => lns.push(`${x.toFixed(2)} ${y.toFixed(2)} l`);
    const txt = (t, x, y, f, s) => { lns.push("BT", `/${f} ${s} Tf`, `${x.toFixed(2)} ${y.toFixed(2)} Td`, `(${esc(t)}) Tj`, "ET"); };
    const rc = (x, y, w, h) => lns.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    const fl = () => lns.push("f"); const rg = (r, g, b) => lns.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);

    const qrData = seller.qrCode ? await getQRImage(seller.qrCode) : null;
    const logoData = seller.logo ? await getQRImage(seller.logo) : null;

    rg(0.059, 0.059, 0.098); rc(0, H - 240, W, 240); fl();

    let xOffset = M;
    if (logoData) {
        const imgSize = 80;
        lns.push(`q ${imgSize} 0 0 ${imgSize} ${M} ${H - 120} cm /ImLogo Do Q`);
        xOffset += 100;
    }

    rg(0.961, 0.784, 0.259); txt(biz.toUpperCase(), xOffset, H - 80, "F2", 36);
    rg(0.8, 0.8, 0.8); txt(seller?.tagline || "", xOffset, H - 105, "F1", 12);
    rg(1, 1, 1);
    txt(`Email: ${seller?.email || ""}`, xOffset, H - 140, "F1", 11);
    txt(`Phone: ${seller?.phone || ""}`, xOffset, H - 155, "F1", 11);
    txt(`Address: ${seller?.address || ""}`, xOffset, H - 170, "F1", 11);
    if (seller?.gstin) txt(`Tax ID: ${seller.gstin}`, xOffset, H - 185, "F1", 11);

    rg(1, 1, 1); txt("INVOICE", W - M - 200, H - 80, "F2", 32);
    txt(`No: ${inv.id}`, W - M - 200, H - 110, "F2", 16);
    txt(`Date: ${inv.date}`, W - M - 200, H - 130, "F1", 12);
    if (inv.time) txt(`Time: ${inv.time}`, W - M - 200, H - 145, "F1", 12);
    txt(`Due: ${inv.due || inv.date}`, W - M - 200, H - 160, "F1", 12);

    rg(0, 0, 0); txt("BILL TO", M, H - 320, "F2", 14);
    rg(0.2, 0.2, 0.2); txt(client?.name || "Customer", M, H - 345, "F2", 18);
    rg(0.4, 0.4, 0.4);
    txt(client?.email || "", M, H - 365, "F1", 12);
    txt(client?.phone || "", M, H - 380, "F1", 12);
    txt(client?.address || "", M, H - 395, "F1", 12);

    let cy = H - 480;
    rg(0.95, 0.95, 0.95); rc(M, cy - 10, W - M * 2, 40); fl();
    rg(0.1, 0.1, 0.1);
    txt("DESCRIPTION", M + 10, cy + 10, "F2", 11);
    txt("QTY", M + 300, cy + 10, "F2", 11);
    txt("PRICE", M + 370, cy + 10, "F2", 11);
    txt("TAX %", M + 460, cy + 10, "F2", 11);
    txt("TAX AMT", M + 550, cy + 10, "F2", 11);
    txt("TOTAL", W - M - 100, cy + 10, "F2", 11);

    cy -= 50;
    const fmt = (n) => formatCurrency(n, currency);
    (inv?.items || []).forEach(it => {
        const lineCost = (it.qty || 0) * (it.price || 0);
        const taxList = getItemTaxList(it, taxRates);
        const totalTaxRate = taxList.reduce((sum, t) => sum + t.rate, 0);
        const taxAmount = itemTaxTotal(it, taxRates);
        rg(0.3, 0.3, 0.3);
        txt(it.desc || "", M + 10, cy, "F1", 12);
        txt(String(it.qty || 0), M + 305, cy, "F1", 12);
        txt(fmt(it.price || 0).replace(/[^\x00-\x7F]/g, ""), M + 370, cy, "F1", 12);
        txt(`${totalTaxRate}%`, M + 465, cy, "F1", 12);
        txt(fmt(taxAmount).replace(/[^\x00-\x7F]/g, ""), M + 550, cy, "F1", 12);
        rg(0, 0, 0); txt(fmt(lineCost + taxAmount).replace(/[^\x00-\x7F]/g, ""), W - M - 100, cy, "F2", 12);
        rg(0.9, 0.9, 0.9); move(M, cy - 12); lto(W - M, cy - 12); lns.push("s");
        cy -= 35;
    });

    cy -= 40;
    const subtotal = total(inv?.items);
    const taxGrandTotal = (inv?.items || []).reduce((s, it) => s + itemTaxTotal(it, taxRates), 0);
    const grandTotal = totalWithTax(inv?.items, taxRates);

    const drawTotalLine = (label, val, y, isBold = false) => {
        rg(0.4, 0.4, 0.4); txt(label, W - M - 250, y, isBold ? "F2" : "F1", 14);
        rg(0, 0, 0); txt(val.replace(/[^\x00-\x7F]/g, ""), W - M - 100, y, isBold ? "F2" : "F1", 14);
    };

    drawTotalLine("Subtotal", fmt(subtotal), cy); cy -= 30;
    drawTotalLine("Tax Total", fmt(taxGrandTotal), cy); cy -= 40;
    const boxW = 350;
    rg(0.961, 0.784, 0.259); rc(W - M - boxW, cy - 15, boxW, 55); fl();
    rg(0, 0, 0); txt("TOTAL AMOUNT", W - M - boxW + 20, cy + 10, "F2", 16);
    txt(fmt(grandTotal).replace(/[^\x00-\x7F]/g, ""), W - M - 100, cy + 10, "F2", 18);
    if (inv.notes) {
        cy -= 80;
        rg(0.059, 0.059, 0.098); txt("NOTES", M, cy, "F2", 14);
        rg(0.3, 0.3, 0.3);
        const noteLines = inv.notes.split('\n');
        noteLines.forEach((line, i) => {
            txt(line, M, cy - 25 - (i * 20), "F1", 11);
        });
        cy -= (noteLines.length * 20) + 20;
    }

    if (qrData) {
        const qrSize = 350; cy -= (qrSize + 100);
        rg(0.95, 0.95, 0.95); rc(M, cy, qrSize + 20, qrSize + 20); fl();
        lns.push(`q ${qrSize} 0 0 ${qrSize} ${M + 10} ${cy + 10} cm /Im1 Do Q`);
        rg(0.4, 0.4, 0.4);
        txt("PAYMENT QR", M + qrSize + 40, cy + 200, "F2", 20);
        txt("SCAN TO PAY", M + qrSize + 40, cy + 170, "F1", 16);
    }
    return { stream: lns.join("\n"), qrData, logoData };
};

export const getBatchPDF = async (invList, clients, seller, currency, taxRates) => {
    const W = 850, H = 1600;
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
        const { stream, qrData, logoData } = await getInvoicePageStream(inv, getClient(inv.clientId), seller, currency, taxRates);
        const xObjMap = {};
        if (qrData) {
            const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${qrData.w} /Height ${qrData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${qrData.hex.length} >>\nstream\n${qrData.hex}\nendstream`);
            xObjMap["Im1"] = id;
        }
        if (logoData) {
            const id = addObj(`<< /Type /XObject /Subtype /Image /Width ${logoData.w} /Height ${logoData.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${logoData.hex.length} >>\nstream\n${logoData.hex}\nendstream`);
            xObjMap["ImLogo"] = id;
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
    pdfParts.push(enc.encode(`trailer << /Size ${objCount + 1} /Root ${catID} 0 R >>\nstartxref\n${xOff}\n%%EOF`));

    const totalLen = pdfParts.reduce((acc, p) => acc + p.length, 0);
    const finalPdf = new Uint8Array(totalLen);
    let curIdx = 0;
    pdfParts.forEach(p => { finalPdf.set(p, curIdx); curIdx += p.length; });
    const blob = new Blob([finalPdf], { type: "application/pdf" });
    return { bytes: finalPdf, blob, url: URL.createObjectURL(blob) };
};

export const getPDFData = async (inv, client, seller, currency, taxRates) => {
    // getBatchPDF expects invList and clients list
    const pdf = await getBatchPDF([inv], [client], seller, currency, taxRates);
    return pdf.bytes;
};
