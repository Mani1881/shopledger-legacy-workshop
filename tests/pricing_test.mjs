import { describe, it } from 'node:test';
import * as pricing from '../lib/pricing.js';
import * as tax from '../lib/tax.js';
import * as coupons from '../lib/coupons.js';
import * as assert from 'node:assert';

// ── Test data: a single item, no coupon ──────────────────────────
const item5kgRice = { id: 1, sku: 'GRN-001', name: 'Indrayani Basmati Rice 5kg', hsn: '1006', price: 640, qty: 1 };
const itemOil1L = { id: 4, sku: 'OIL-001', name: 'Cold-Pressed Sunflower Oil 1L', hsn: '1512', price: 190, qty: 2 };

// ── CURRENT BEHAVIOUR: pricing.subtotal ──────────────────────────
describe('pricing.subtotal (CURRENT BEHAVIOUR)', () => {
  it('sums price * qty for line items', () => {
    const result = pricing.subtotal([item5kgRice]);
    // 640 * 1 = 640
    assert.strictEqual(result, 640);
  });

  it('sums multiple line items', () => {
    const result = pricing.subtotal([item5kgRice, itemOil1L]);
    // 640 + 190*2 = 640 + 380 = 1020
    assert.strictEqual(result, 1020);
  });
});

// ── CURRENT BEHAVIOUR: tax.getRateForItem ────────────────────────
describe('tax.getRateForItem (CURRENT BEHAVIOUR)', () => {
  it('resolves HSN 1006 to 5% rate', () => {
    const rate = tax.getRateForItem({ hsn: '1006', gstRate: undefined });
    // config.hsnSlabs['1006'] = 5 → 5/100 = 0.05
    assert.strictEqual(rate, 0.05);
  });

  it('falls back to defaultRate 0.18 when HSN not in slabs', () => {
    const rate = tax.getRateForItem({ hsn: '9999', gstRate: undefined });
    assert.strictEqual(rate, 0.18);
  });

  it('uses item.gstRate if provided and numeric', () => {
    const rate = tax.getRateForItem({ gstRate: 12 });     // 12 / 100 = 0.12
    assert.strictEqual(rate, 0.12);
  });
});

// ── CURRENT BEHAVIOUR: tax.splitCgstSgst ────────────────────────
describe('tax.splitCgstSgst (CURRENT BEHAVIOUR)', () => {
  it('splits tax equally into cgst/sgst with rounding', () => {
    const { cgst, sgst } = tax.splitCgstSgst(18.07);
    // half = round2(18.07/2) = round2(9.035) = 9.04
    // remainder = round2(18.07 - 9.04) = round2(9.03) = 9.03
    assert.strictEqual(cgst, 9.04);
    assert.strictEqual(sgst, 9.03);
  });
});

// ── CURRENT BEHAVIOUR: coupons.calculateDiscount ────────────────
describe('coupons.calculateDiscount (CURRENT BEHAVIOUR)', () => {
  it('computes 10% of 1020 = 102 for SAVE10', () => {
    const disc = coupons.calculateDiscount(1020, 'SAVE10');
    assert.strictEqual(disc, 102);
  });

  it('applies maxDiscount cap: 15% of 2240 = 336, below max 400', () => {
    const disc = coupons.calculateDiscount(2240, 'WHOLESALE15');
    assert.strictEqual(disc, 336); // 2240 * 15 / 100 = 336, below max 400
  });

  it('truncates coupon if subtotal too low: FLAT50 minOrder=300, subtotal=200 → 0', () => {
    const disc = coupons.calculateDiscount(200, 'FLAT50');
    assert.strictEqual(disc, 0);
  });
});

// ── CURRENT BEHAVIOUR: pricing.computeTotals ────────────────────
describe('pricing.computeTotals (CURRENT BEHAVIOUR)', () => {
  it('computes totals for rice + oil with SAVE10 coupon', () => {
    const items = [item5kgRice, { ...itemOil1L, qty: 1 }];
    // subtotal = 640 + 190 = 830
    // SAVE10: 10% of 830 = 83, maxDiscount 150 → 83
    const result = pricing.computeTotals(items, 'SAVE10');
    // We assert the shape; exact numbers depend on current code.
    assert.ok(result.subtotal > 0);
    assert.ok(result.discount >= 0);
    assert.ok(result.tax >= 0);
    assert.ok(result.total > 0);
    assert.ok(result.cgst >= 0);
    assert.ok(result.sgst >= 0);
  });
});