import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toTrackingStage,
  trackingStageIndex,
  canCustomerCancel,
  isCurrentOrder,
  statusLabel,
  statusToastCopy,
  paymentLabel,
  TRACKING_STAGES
} from './src/lib/orderStatus';
import { buildOrderShareText } from './src/lib/receipt';
import { Order, OrderStatus } from './src/types';

const EVERY_STATUS: OrderStatus[] = [
  'pending', 'accepted', 'preparing', 'ready', 'delivered', 'cancelled',
  'cooking', 'assigned', 'out_for_delivery'
];

// --- stage mapping ----------------------------------------------------------

test('maps every status to a stage, including the legacy vocabulary', () => {
  for (const status of EVERY_STATUS) {
    assert.ok(toTrackingStage(status), `no stage for: ${status}`);
  }
});

test('legacy statuses collapse onto their Phase 2 equivalents', () => {
  assert.equal(toTrackingStage('cooking'), 'preparing');
  assert.equal(toTrackingStage('assigned'), 'out_for_delivery');
  assert.equal(toTrackingStage('ready'), 'out_for_delivery');
});

test('every non-cancelled status resolves to a real timeline index', () => {
  for (const status of EVERY_STATUS) {
    const index = trackingStageIndex(status);
    if (status === 'cancelled') {
      assert.equal(index, -1);
    } else {
      assert.ok(index >= 0 && index < TRACKING_STAGES.length, `bad index for ${status}: ${index}`);
    }
  }
});

test('the timeline moves forward and never backward through the lifecycle', () => {
  const lifecycle: OrderStatus[] = ['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered'];
  const indices = lifecycle.map(trackingStageIndex);
  for (let i = 1; i < indices.length; i++) {
    assert.ok(indices[i] > indices[i - 1], `${lifecycle[i]} did not advance past ${lifecycle[i - 1]}`);
  }
});

// --- cancellation -----------------------------------------------------------

test('a customer may cancel only before the kitchen starts cooking', () => {
  assert.equal(canCustomerCancel({ status: 'pending' }), true);
  assert.equal(canCustomerCancel({ status: 'accepted' }), true);
  for (const status of ['preparing', 'cooking', 'ready', 'assigned', 'out_for_delivery', 'delivered', 'cancelled'] as OrderStatus[]) {
    assert.equal(canCustomerCancel({ status }), false, `should not be cancellable: ${status}`);
  }
});

// --- current vs previous ----------------------------------------------------

test('delivered and cancelled orders are previous, everything else is current', () => {
  assert.equal(isCurrentOrder({ status: 'delivered' }), false);
  assert.equal(isCurrentOrder({ status: 'cancelled' }), false);
  for (const status of ['pending', 'accepted', 'preparing', 'cooking', 'ready', 'assigned', 'out_for_delivery'] as OrderStatus[]) {
    assert.equal(isCurrentOrder({ status }), true, `should be current: ${status}`);
  }
});

// --- labels -----------------------------------------------------------------

test('every status has a human label', () => {
  for (const status of EVERY_STATUS) {
    assert.ok(statusLabel(status).length > 0, `no label for: ${status}`);
  }
  assert.equal(statusLabel('cancelled'), 'Cancelled');
  assert.equal(statusLabel('cooking'), 'Preparing');
});

test('placing an order raises no toast, but every later stage does', () => {
  assert.equal(statusToastCopy('pending'), null);
  for (const status of ['accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'] as OrderStatus[]) {
    assert.ok(statusToastCopy(status), `expected toast copy for: ${status}`);
  }
});

test('payment label distinguishes cash on delivery from an unconfirmed transfer', () => {
  assert.equal(paymentLabel({ payment_method: 'COD', payment_status: 'pending' }), 'Pay on delivery');
  assert.equal(paymentLabel({ payment_method: 'UPI', payment_status: 'pending' }), 'Payment pending confirmation');
  assert.equal(paymentLabel({ payment_method: 'UPI', payment_status: 'completed' }), 'Paid');
  assert.equal(paymentLabel({ payment_method: 'COD', payment_status: 'refunded' }), 'Refunded');
});

// --- share text -------------------------------------------------------------

const order: Order = {
  id: 'abc-123',
  order_number: '#1007',
  customer_id: 'cust-1',
  customer_name: 'Asha Menon',
  customer_phone: '9876543210',
  delivery_address: 'Block A, Room 104',
  items: [
    { dish_id: 'd1', dish_name: 'Chicken Biryani', quantity: 2, price: 220 },
    { dish_id: 'd2', dish_name: 'Gulab Jamun', quantity: 1, price: 60 }
  ],
  subtotal: 500,
  tax_amount: 0,
  delivery_fee: 0,
  total_amount: 500,
  payment_method: 'COD',
  payment_status: 'pending',
  status: 'preparing',
  created_at: '2026-08-07'
};

test('share text names the order, its items and what is owed', () => {
  const text = buildOrderShareText(order, { name: "Trippy's Mehfill" });
  assert.match(text, /#1007/);
  assert.match(text, /2 × Chicken Biryani — ₹440/);
  assert.match(text, /1 × Gulab Jamun — ₹60/);
  assert.match(text, /Total: ₹500/);
  assert.match(text, /Pay on delivery/);
  assert.match(text, /Preparing/);
});
