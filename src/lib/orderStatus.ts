/**
 * The single source of truth for how an order's status is presented to a
 * customer, and what they are allowed to do with it.
 *
 * Two vocabularies are in play (see PHASE2_ORDER_REPORT.md): the Phase 2 set
 * and the legacy values the kitchen, admin and driver screens still write.
 * Mapping happens here, once, so no component has to know about the split.
 */

import { Order, OrderStatus } from '../types';

export type TrackingStage =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export const TRACKING_STAGES: { stage: TrackingStage; label: string; blurb: string }[] = [
  { stage: 'pending',          label: 'Order Placed',    blurb: 'Waiting for the kitchen to accept.' },
  { stage: 'accepted',         label: 'Accepted',        blurb: 'The kitchen has your order.' },
  { stage: 'preparing',        label: 'Preparing',       blurb: 'Your food is being cooked fresh.' },
  { stage: 'out_for_delivery', label: 'Out for Delivery', blurb: 'On the way to you.' },
  { stage: 'delivered',        label: 'Delivered',       blurb: 'Enjoy your meal!' }
];

/** Collapses every stored status onto the stage the customer sees. */
export function toTrackingStage(status: OrderStatus): TrackingStage {
  switch (status) {
    case 'pending': return 'pending';
    case 'accepted': return 'accepted';
    case 'preparing': return 'preparing';
    case 'cooking': return 'preparing';
    case 'ready': return 'out_for_delivery';
    case 'assigned': return 'out_for_delivery';
    case 'out_for_delivery': return 'out_for_delivery';
    case 'delivered': return 'delivered';
    case 'cancelled': return 'cancelled';
    default: return 'pending';
  }
}

/** Index into TRACKING_STAGES; -1 for a cancelled order, which has no progress. */
export function trackingStageIndex(status: OrderStatus): number {
  const stage = toTrackingStage(status);
  if (stage === 'cancelled') return -1;
  return TRACKING_STAGES.findIndex((s) => s.stage === stage);
}

/**
 * A customer may cancel only before the kitchen has committed work to it.
 * Mirrors the database trigger in migration 0006 -- if these two disagree the
 * button appears and then fails, so they are meant to be read together.
 */
export function canCustomerCancel(order: Pick<Order, 'status'>): boolean {
  return order.status === 'pending' || order.status === 'accepted';
}

/** Orders still in flight, newest first. */
export function isCurrentOrder(order: Pick<Order, 'status'>): boolean {
  return order.status !== 'delivered' && order.status !== 'cancelled';
}

export function statusLabel(status: OrderStatus): string {
  if (status === 'cancelled') return 'Cancelled';
  const stage = toTrackingStage(status);
  return TRACKING_STAGES.find((s) => s.stage === stage)?.label ?? 'Order Placed';
}

/** Toast copy for a status the order has just moved into. */
export function statusToastCopy(status: OrderStatus): { title: string; description: string } | null {
  switch (toTrackingStage(status)) {
    case 'accepted':
      return { title: 'Kitchen accepted your order', description: 'They are getting started on it now.' };
    case 'preparing':
      return { title: 'Your food is being prepared', description: 'Freshly cooked, coming right up.' };
    case 'out_for_delivery':
      return { title: 'Out for delivery', description: 'Your order is on the way.' };
    case 'delivered':
      return { title: 'Delivered', description: 'Enjoy your meal! Tap to leave feedback.' };
    case 'cancelled':
      return { title: 'Order cancelled', description: 'This order will not be delivered.' };
    default:
      return null;
  }
}

/** How the payment currently stands, in words the customer can act on. */
export function paymentLabel(order: Pick<Order, 'payment_method' | 'payment_status'>): string {
  if (order.payment_status === 'completed') return 'Paid';
  if (order.payment_status === 'failed') return 'Payment failed';
  if (order.payment_status === 'refunded') return 'Refunded';
  return order.payment_method === 'COD' ? 'Pay on delivery' : 'Payment pending confirmation';
}
