import * as assert from 'node:assert';
import * as invoices from '../lib/invoice.js';
import * as pricing from '../lib/pricing.js';
import * as tax from '../lib/tax.js';
import * as coupons from '../lib/coupons.js';

// Simulate order #1002 from db.json: rice + oil with SAVE10 coupon
const order1002 = {
  id: 1002,
  date: '05/01/2022',
  customer: 'Anil Kulkarni',
  customerId: 2,
  paymentMode: 'upi',
  status: 'completed',
  items: [
    { id: 1, sku: 'GRN-001', name: 'Indrayani Basmati Rice 5kg', hsn: '1006', price: 640, qty: 1 },
    { id: 4, sku: 'OIL-001', name: 'Cold-Pressed Sunflower Oil 1L', hsn: '1512', price: 190, qty: 2 }
  ],
  coupon: 'SAVE10',
  subtotal: 1020,
  discount: 102,
  tax: 45.9,
  total: 963.9
};

// ── MANUAL TEST: observe the mismatch ────────────────────────────
console.log('=== Comparing pricing.computeTotals vs invoice.computeInvoiceFigures ===\n');

// What pricing module computes
const items = order1002.items;
const totals = pricing.computeTotals(items, order1002.coupon);
console.log('pricing.computeTotals():');
console.log('  subtotal:', totals.subtotal);
console.log('  discount:', totals.discount);
console.log('  tax:', totals.tax);
console.log('  cgst:', totals.cgst);
console.log('  sgst:', totals.sgst);
console.log('  total:', totals.total);

// What invoice module computes
const calc = invoices.computeInvoiceFigures(order1002);
console.log('\ninvoice.computeInvoiceFigures():');
console.log('  subtotal:', calc.subtotal);
console.log('  discount:', calc.discount);
console.log('  tax:', calc.tax);
console.log('  cgst:', calc.cgst);
console.log('  sgst:', calc.sgst);
console.log('  total:', calc.total);

// The gap
const ledgerTotal = 963.9;
console.log('\n=== ORDER LEDGER TOTAL: ₹963.90 ===\n');
console.log('pricing total matches ledger:', totals.total === ledgerTotal);
console.log('invoice total matches ledger:', calc.total === ledgerTotal);
console.log('invoice total matches pricing total:', calc.total === totals.total);

// ── ASSERTIONS ──────────────────────────────────────────────────
assert.strictEqual(totals.total, ledgerTotal, 'pricing total must match the order ledger');
assert.strictEqual(calc.total, ledgerTotal, 'invoice total must match the order ledger');
assert.strictEqual(calc.total, totals.total, 'invoice total must match pricing total');