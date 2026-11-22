const { describe, it } = require('node:test');
const assert = require('node:assert');
const invoice = require('../lib/invoice.js');
const pricing = require('../lib/pricing.js');
const store = require('../lib/store.js');

// Test data from db.json order #1002
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

// Test data from db.json order #1003 (FLAT50 coupon)
const order1003 = {
  id: 1003,
  date: '14/01/2022',
  customer: 'Walk-in',
  customerId: null,
  paymentMode: 'cash',
  status: 'completed',
  items: [
    { id: 7, sku: 'DRY-002', name: 'Pasteurized Table Butter 500g', hsn: '0405', price: 260, qty: 1 },
    { id: 8, sku: 'BEV-001', name: 'Assam CTC Masala Chai 250g', hsn: '0902', price: 140, qty: 1 }
  ],
  coupon: 'FLAT50',
  subtotal: 400,
  discount: 50,
  tax: 49.35,
  total: 399.35
};

// Test data from db.json order #1006 (WELCOME coupon)
const order1006 = {
  id: 1006,
  date: '18/02/2022',
  customer: 'Meera Joshi',
  customerId: 1,
  paymentMode: 'khata',
  status: 'completed',
  items: [
    { id: 6, sku: 'DRY-001', name: 'A2 Gir Cow Ghee 500ml', hsn: '0405', price: 450, qty: 2 },
    { id: 9, sku: 'BEV-002', name: 'Filter Coffee Decoction Blend 500g', hsn: '0901', price: 310, qty: 1 }
  ],
  coupon: 'WELCOME',
  subtotal: 1210,
  discount: 60.5,
  tax: 155.61,
  total: 1305.11
};

// Test data for order #1004 (SAVE10 discount cap)
const order1004 = {
  id: 1004,
  date: '30/01/2022',
  customer: 'Kalyani Foods (Wholesale)',
  customerId: 5,
  paymentMode: 'khata',
  status: 'completed',
  items: [
    { id: 5, sku: 'OIL-002', name: 'Cold-Pressed Groundnut Oil 5L', hsn: '1508', price: 1120, qty: 2 }
  ],
  coupon: 'SAVE10',
  subtotal: 2240,
  discount: 150,
  tax: 104.5,
  total: 2194.5
};

describe('invoice.computeInvoiceFigures', function () {
  it('CURRENT BEHAVIOUR: matches pricing.computeTotals for order 1002 (SAVE10, 5% GST items)', function () {
    const invoiceFigures = invoice.computeInvoiceFigures(order1002);
    const pricingTotals = pricing.computeTotals(order1002.items, order1002.coupon);

    assert.strictEqual(invoiceFigures.subtotal, pricingTotals.subtotal);
    assert.strictEqual(invoiceFigures.discount, pricingTotals.discount);
    assert.strictEqual(invoiceFigures.taxable, pricingTotals.taxable);
    assert.strictEqual(invoiceFigures.tax, pricingTotals.tax);
    assert.strictEqual(invoiceFigures.cgst, pricingTotals.cgst);
    assert.strictEqual(invoiceFigures.sgst, pricingTotals.sgst);
    assert.strictEqual(invoiceFigures.total, pricingTotals.total);
    assert.strictEqual(invoiceFigures.total, 963.9);
  });

  it('CURRENT BEHAVIOUR: matches pricing.computeTotals for order 1003 (FLAT50, mixed GST)', function () {
    const invoiceFigures = invoice.computeInvoiceFigures(order1003);
    const pricingTotals = pricing.computeTotals(order1003.items, order1003.coupon);

    assert.strictEqual(invoiceFigures.subtotal, pricingTotals.subtotal);
    assert.strictEqual(invoiceFigures.discount, pricingTotals.discount);
    assert.strictEqual(invoiceFigures.taxable, pricingTotals.taxable);
    assert.strictEqual(invoiceFigures.tax, pricingTotals.tax);
    assert.strictEqual(invoiceFigures.cgst, pricingTotals.cgst);
    assert.strictEqual(invoiceFigures.sgst, pricingTotals.sgst);
    assert.strictEqual(invoiceFigures.total, pricingTotals.total);
    assert.strictEqual(invoiceFigures.total, 399.35);
  });

  it('CURRENT BEHAVIOUR: matches pricing.computeTotals for order 1006 (WELCOME, 12% + 18% GST)', function () {
    const invoiceFigures = invoice.computeInvoiceFigures(order1006);
    const pricingTotals = pricing.computeTotals(order1006.items, order1006.coupon);

    assert.strictEqual(invoiceFigures.subtotal, pricingTotals.subtotal);
    assert.strictEqual(invoiceFigures.discount, pricingTotals.discount);
    assert.strictEqual(invoiceFigures.taxable, pricingTotals.taxable);
    assert.strictEqual(invoiceFigures.tax, pricingTotals.tax);
    assert.strictEqual(invoiceFigures.cgst, pricingTotals.cgst);
    assert.strictEqual(invoiceFigures.sgst, pricingTotals.sgst);
    assert.strictEqual(invoiceFigures.total, pricingTotals.total);
    assert.strictEqual(invoiceFigures.total, 1305.11);
  });

  it('CURRENT BEHAVIOUR: uses HSN slab rates from config (not defaultRate)', function () {
    // Rice (1006) = 5%, Oil (1512) = 5%
    const figures = invoice.computeInvoiceFigures(order1002);
    // Both items have 5% GST
    assert.strictEqual(figures.rows[0].gstPercent, 5);
    assert.strictEqual(figures.rows[1].gstPercent, 5);
    // Tax should be 5% of 918 = 45.9
    assert.strictEqual(figures.tax, 45.9);
  });

  it('CURRENT BEHAVIOUR: apportions coupon discount proportionally across line items', function () {
    const figures = invoice.computeInvoiceFigures(order1002);
    // SAVE10 = 10% off, apportioned: rice gets 64, oil gets 38 (ratio 640:380)
    assert.strictEqual(figures.rows[0].lineTax, 28.8);  // 576 * 5%
    assert.strictEqual(figures.rows[1].lineTax, 17.1);  // 342 * 5%
  });

  it('CURRENT BEHAVIOUR: CGST and SGST split correctly using round2', function () {
    const figures = invoice.computeInvoiceFigures(order1002);
    // Total tax = 45.9, half = 22.95 each
    assert.strictEqual(figures.cgst, 22.95);
    assert.strictEqual(figures.sgst, 22.95);
  });

  it('applies the SAVE10 maximum discount and matches the 1004 ledger total', function () {
    const figures = invoice.computeInvoiceFigures(order1004);
    const pricingTotals = pricing.computeTotals(order1004.items, order1004.coupon);

    assert.strictEqual(figures.discount, 150);
    assert.strictEqual(figures.tax, 104.5);
    assert.strictEqual(figures.total, 2194.5);
    assert.strictEqual(figures.total, pricingTotals.total);
  });
});