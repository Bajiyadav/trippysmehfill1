import { supabase } from '../../lib/supabase';
import { Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus } from '../../types';

export const ordersService = {
  async fetchOrders(): Promise<Order[]> {
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      throw ordersError;
    }

    return (ordersData || []).map((row) => ({
      id: row.id,
      order_number: row.order_number,
      customer_id: row.customer_id,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      delivery_address: row.delivery_address,
      landmark: row.landmark || undefined,
      campus: row.campus || undefined,
      items: (row.order_items || []).map((item: any) => ({
        dish_id: item.dish_id || item.id,
        dish_name: item.dish_name,
        quantity: item.quantity,
        price: Number(item.price),
        is_veg: item.is_veg,
      })),
      subtotal: Number(row.subtotal),
      tax_amount: Number(row.tax_amount),
      delivery_fee: Number(row.delivery_fee),
      total_amount: Number(row.total_amount),
      payment_method: row.payment_method as PaymentMethod,
      payment_status: row.payment_status as PaymentStatus,
      upi_transaction_id: row.upi_transaction_id || undefined,
      status: row.status as OrderStatus,
      driver_id: row.driver_id || undefined,
      driver_name: row.driver_name || undefined,
      driver_phone: row.driver_phone || undefined,
      kitchen_notes: row.kitchen_notes || undefined,
      rating: row.rating || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  },

  async fetchCustomerOrders(customerId: string): Promise<Order[]> {
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('customer_id', customerId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching customer orders:', ordersError);
      throw ordersError;
    }

    return (ordersData || []).map((row) => ({
      id: row.id,
      order_number: row.order_number,
      customer_id: row.customer_id,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      delivery_address: row.delivery_address,
      landmark: row.landmark || undefined,
      campus: row.campus || undefined,
      items: (row.order_items || []).map((item: any) => ({
        dish_id: item.dish_id || item.id,
        dish_name: item.dish_name,
        quantity: item.quantity,
        price: Number(item.price),
        is_veg: item.is_veg,
      })),
      subtotal: Number(row.subtotal),
      tax_amount: Number(row.tax_amount),
      delivery_fee: Number(row.delivery_fee),
      total_amount: Number(row.total_amount),
      payment_method: row.payment_method as PaymentMethod,
      payment_status: row.payment_status as PaymentStatus,
      upi_transaction_id: row.upi_transaction_id || undefined,
      status: row.status as OrderStatus,
      driver_id: row.driver_id || undefined,
      driver_name: row.driver_name || undefined,
      driver_phone: row.driver_phone || undefined,
      kitchen_notes: row.kitchen_notes || undefined,
      rating: row.rating || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  },

  async createOrder(orderInput: Omit<Order, 'id' | 'created_at'>): Promise<Order> {
    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          order_number: orderInput.order_number,
          customer_id: orderInput.customer_id || null,
          customer_name: orderInput.customer_name,
          customer_phone: orderInput.customer_phone,
          delivery_address: orderInput.delivery_address,
          landmark: orderInput.landmark || null,
          campus: orderInput.campus || null,
          subtotal: orderInput.subtotal,
          tax_amount: orderInput.tax_amount,
          delivery_fee: orderInput.delivery_fee,
          total_amount: orderInput.total_amount,
          payment_method: orderInput.payment_method,
          payment_status: orderInput.payment_status,
          upi_transaction_id: orderInput.upi_transaction_id || null,
          status: orderInput.status,
          driver_id: orderInput.driver_id || null,
          driver_name: orderInput.driver_name || null,
          driver_phone: orderInput.driver_phone || null,
          kitchen_notes: orderInput.kitchen_notes || null,
        },
      ])
      .select()
      .single();

    if (orderError) {
      console.error('Error inserting order:', orderError);
      throw orderError;
    }

    if (orderInput.items && orderInput.items.length > 0) {
      const itemsPayload = orderInput.items.map((item) => ({
        order_id: insertedOrder.id,
        dish_id: item.dish_id && item.dish_id.length > 20 ? item.dish_id : null,
        dish_name: item.dish_name,
        quantity: item.quantity,
        price: item.price,
        is_veg: item.is_veg ?? false,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
      if (itemsError) {
        // An order row with no line items is worse than no order at all: the
        // kitchen sees a ticket with nothing to cook and the customer has been
        // told it worked. Remove the header row and report the failure.
        console.error('Error inserting order items:', itemsError);
        await supabase.from('orders').delete().eq('id', insertedOrder.id);
        throw itemsError;
      }
    }

    return {
      ...orderInput,
      id: insertedOrder.id,
      created_at: insertedOrder.created_at,
    };
  },

  /**
   * Records the customer's claim that a UPI transfer was made.
   *
   * This is a claim, not a verified settlement -- nothing here talks to a
   * payment gateway, so it must never be called with 'completed' on the
   * strength of the customer pressing a button.
   */
  async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    upiTransactionId?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        ...(upiTransactionId ? { upi_transaction_id: upiTransactionId } : {}),
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  },

  /**
   * Customer-initiated cancellation.
   *
   * The `status` guard is repeated in the WHERE clause rather than trusted to
   * the UI: between the button rendering and this call, the kitchen may have
   * accepted and started cooking. `select()` returning zero rows means the
   * order moved on (or RLS refused), which is reported rather than swallowed.
   *
   * Requires migration 0006 -- customers have no UPDATE policy without it.
   */
  async cancelOrder(orderId: string): Promise<void> {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)
      .in('status', ['pending', 'accepted'])
      .select('id');

    if (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('This order can no longer be cancelled — the kitchen has already started preparing it.');
    }
  },

  /** Single order by id, used by live tracking to poll a fresh status. */
  async fetchOrderById(orderId: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
    if (!data) return null;

    return {
      id: data.id,
      order_number: data.order_number,
      customer_id: data.customer_id,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      delivery_address: data.delivery_address,
      landmark: data.landmark || undefined,
      campus: data.campus || undefined,
      items: (data.order_items || []).map((item: any) => ({
        dish_id: item.dish_id || item.id,
        dish_name: item.dish_name,
        quantity: item.quantity,
        price: Number(item.price),
        is_veg: item.is_veg,
      })),
      subtotal: Number(data.subtotal),
      tax_amount: Number(data.tax_amount),
      delivery_fee: Number(data.delivery_fee),
      total_amount: Number(data.total_amount),
      payment_method: data.payment_method as PaymentMethod,
      payment_status: data.payment_status as PaymentStatus,
      upi_transaction_id: data.upi_transaction_id || undefined,
      status: data.status as OrderStatus,
      driver_id: data.driver_id || undefined,
      driver_name: data.driver_name || undefined,
      driver_phone: data.driver_phone || undefined,
      kitchen_notes: data.kitchen_notes || undefined,
      rating: data.rating || undefined,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  async assignDriver(
    orderId: string,
    driverId: string,
    driverName: string,
    driverPhone: string
  ): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({
        driver_id: driverId,
        driver_name: driverName,
        driver_phone: driverPhone,
        status: 'assigned',
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error assigning driver:', error);
      throw error;
    }
  },
};
