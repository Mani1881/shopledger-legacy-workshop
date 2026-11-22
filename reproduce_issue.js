const assert = require('node:assert');
const invoice = require('./lib/invoice.js');
const pricing = require('./lib/pricing.js');
const store = require('./lib/store.js');

// Reproduce the issue with Order #1002 from db.json
const db = store.read();
const order = db.orders.find(o => o.id === 1002);
console.log('Order:', order);

// Expected: pricing.computeTotals(order.items, order.coupon).total == order.total
const pricingTotals = pricing.computeTotals(order.items, order.coupon);
console.log('Pricing totals:', pricingTotals);
assert.strictEqual(pricingTotals.total, order.total, 'Pricing total should match ledger');

// Actual: invoice.computeInvoiceFigures(order).total != order.total
const invoiceFigures = invoice.computeInvoiceFigures(order);
console.log('Invoice figures:', invoiceFigures);
assert.strictEqual(invoiceFigures.total, order.total, 'Invoice total should match ledger');

console.log('Test passed!');
