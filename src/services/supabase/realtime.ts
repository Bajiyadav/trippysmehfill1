import { supabase } from '../../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export const realtimeService = {
  subscribeToOrders(onUpdate: (payload: any) => void): RealtimeChannel {
    const channel = supabase
      .channel('orders_realtime_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();

    return channel;
  },

  subscribeToInventory(onUpdate: (payload: any) => void): RealtimeChannel {
    const channel = supabase
      .channel('inventory_realtime_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory' },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();

    return channel;
  },

  subscribeToNotifications(userId: string, onUpdate: (payload: any) => void): RealtimeChannel {
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();

    return channel;
  },

  unsubscribe(channel: RealtimeChannel): void {
    supabase.removeChannel(channel);
  },
};
