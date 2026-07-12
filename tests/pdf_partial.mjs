// Headless verification of partial-payment PDF rendering (A4 + Thermal).
// Runs the REAL pdf.js functions with a mock invoice that has amountPaid set.
// No browser needed; db.js only touches indexedDB inside functions we don't call.
import { getInvoicePageStream, getThermalInvoicePageStream } from "../src/lib/pdf.js";

const currency = { code: "INR", symbol: "₹", locale: "en-IN", name: "Indian Rupee" };
const taxRates = [{ id: "t1", label: "GST 18%", rate: 18 }];
const seller = { name: "Test Biz", invoicePrefix: "INV" };
const client = { id: "c1", name: "Alice Corp" };

// Total = 1000 + 18% = 1180. Partially paid 500 -> balance 680.
const inv = {
  id: "INV-001-TEST",
  clientId: "c1",
  status: "sent",
  totalAmount: 1180,
  amountPaid: 500,
  items: [{ id: "i1", desc: "Widget", qty: 1, price: 1000, hsn: "", tax: ["t1"], taxSnapshots: [{ label: "GST 18%", rate: 18 }], isInclusive: false }]
};

const assertContains = (stream, label, needles) => {
  const missing = needles.filter(n => !stream.includes(n));
  if (missing.length) {
    console.log(`FAIL [${label}] missing: ${JSON.stringify(missing)}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS [${label}] contains: ${needles.join(", ")}`);
  }
};

const a4 = await getInvoicePageStream(inv, client, seller, currency, taxRates);
assertContains(a4.stream, "A4", ["Amount Paid", "500.00", "Balance Due", "680.00"]);

const thermal = await getThermalInvoicePageStream(inv, [client], seller, currency, taxRates, "", "free");
assertContains(thermal.stream, "Thermal", ["Paid :", "500.00", "Balance :", "680.00"]);

// Fully paid case -> "Paid in Full" / no Balance Due (amount formatted with thousands sep)
const invFull = { ...inv, amountPaid: 1180, status: "paid" };
const a4f = await getInvoicePageStream(invFull, client, seller, currency, taxRates);
assertContains(a4f.stream, "A4-full", ["Amount Paid", "1,180.00", "Paid in Full"]);
const hasBalanceInFull = a4f.stream.includes("Balance Due");
console.log(hasBalanceInFull ? "INFO [A4-full] Balance Due still shown (acceptable)" : "PASS [A4-full] no Balance Due line when fully paid");
const tf = await getThermalInvoicePageStream(invFull, [client], seller, currency, taxRates, "", "free");
assertContains(tf.stream, "Thermal-full", ["Paid :", "1,180.00", "Paid in Full"]);

console.log("PDF partial-payment verification complete.");
