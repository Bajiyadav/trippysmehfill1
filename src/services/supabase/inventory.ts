import { supabase } from '../../lib/supabase';
import { InventoryItem } from '../../types';

export const inventoryService = {
  async fetchInventory(): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('is_deleted', false)
      .order('item_name', { ascending: true });

    if (error) {
      console.error('Error fetching inventory:', error);
      throw error;
    }

    return (data || []).map((item) => ({
      id: item.id,
      item_name: item.item_name,
      unit: item.unit,
      quantity: Number(item.quantity),
      low_alert_threshold: Number(item.low_alert_threshold),
      updated_at: item.updated_at,
    }));
  },

  async updateStock(id: string, newQuantity: number, reason: string = 'manual_adjustment'): Promise<void> {
    const { data: oldItem, error: fetchErr } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('id', id)
      .single();

    if (fetchErr) {
      console.error('Error fetching existing inventory item:', fetchErr);
    }

    const { error: updateErr } = await supabase
      .from('inventory')
      .update({ quantity: newQuantity })
      .eq('id', id);

    if (updateErr) {
      console.error('Error updating stock level:', updateErr);
      throw updateErr;
    }

    if (oldItem) {
      const changeQty = newQuantity - Number(oldItem.quantity);
      await supabase.from('inventory_transactions').insert([
        {
          inventory_id: id,
          change_qty: changeQty,
          reason,
        },
      ]);
    }
  },

  async addInventoryItem(item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> {
    const { data, error } = await supabase
      .from('inventory')
      .insert([
        {
          item_name: item.item_name,
          unit: item.unit,
          quantity: item.quantity,
          low_alert_threshold: item.low_alert_threshold,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding inventory item:', error);
      throw error;
    }

    return {
      id: data.id,
      item_name: data.item_name,
      unit: data.unit,
      quantity: Number(data.quantity),
      low_alert_threshold: Number(data.low_alert_threshold),
      updated_at: data.updated_at,
    };
  },

  async deleteInventoryItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('inventory')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) {
      console.error('Error deleting inventory item:', error);
      throw error;
    }
  },
};
