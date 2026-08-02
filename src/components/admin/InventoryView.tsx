import React, { useState } from 'react';
import { InventoryItem, RecipeDeduction, MenuItem } from '../../types';
import { Plus, Minus, Package, Save } from 'lucide-react';

interface InventoryViewProps {
  inventory: InventoryItem[];
  menuItems: MenuItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onAddStockItem: (item: InventoryItem) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  menuItems,
  onUpdateQuantity,
  onAddStockItem
}) => {
  const [newItemName, setNewItemName] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('kg');
  const [newItemQty, setNewItemQty] = useState(10);
  const [newItemAlert, setNewItemAlert] = useState(5);

  const [recipes, setRecipes] = useState<RecipeDeduction[]>([]);
  const [selectedDish, setSelectedDish] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [qtyPerServing, setQtyPerServing] = useState(1);

  const handleCreateStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;

    onAddStockItem({
      id: 'inv-' + Date.now(),
      item_name: newItemName,
      unit: newItemUnit,
      quantity: Number(newItemQty),
      low_alert_threshold: Number(newItemAlert)
    });

    setNewItemName('');
    setNewItemQty(10);
  };

  const handleSaveRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDish || !selectedIngredient) return;

    const dishObj = menuItems.find(m => m.id === selectedDish);
    const ingObj = inventory.find(i => i.id === selectedIngredient);

    if (dishObj && ingObj) {
      setRecipes([
        ...recipes,
        {
          id: 'rec-' + Date.now(),
          dish_id: dishObj.id,
          dish_name: dishObj.name,
          ingredient_id: ingObj.id,
          ingredient_name: ingObj.item_name,
          qty_per_serving: qtyPerServing,
          unit: ingObj.unit
        }
      ]);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 font-serif">Inventory & stock</h1>
        <p className="text-xs text-gray-500">Ingredients are deducted automatically whenever an order is marked delivered.</p>
      </div>

      {/* Stock Cards Grid matching video frame 1:24 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {inventory.map((item) => {
          const isLow = item.quantity <= item.low_alert_threshold;
          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl p-4 border shadow-sm flex flex-col justify-between ${
                isLow ? 'border-red-300 bg-red-50/30' : 'border-gray-100'
              }`}
            >
              <div>
                <span className="text-sm font-extrabold text-gray-900 block">{item.item_name}</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-gray-900">{item.quantity}</span>
                  <span className="text-xs text-gray-500 font-bold">{item.unit}</span>
                </div>
              </div>

              {/* +10 / -10 buttons matching video frame 1:24 */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => onUpdateQuantity(item.id, 10)}
                  className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 font-extrabold text-xs text-gray-800 rounded-lg transition"
                >
                  +10
                </button>
                <button
                  onClick={() => onUpdateQuantity(item.id, -10)}
                  className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 font-extrabold text-xs text-gray-800 rounded-lg transition"
                >
                  -10
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Stock Item Form */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <h3 className="font-bold text-gray-900 text-sm">Add New Stock Item</h3>
        <form onSubmit={handleCreateStock} className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
          <input
            type="text"
            placeholder="Item name (e.g. Paneer)"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            required
            className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
          />
          <input
            type="text"
            placeholder="Unit (kg, pcs, L)"
            value={newItemUnit}
            onChange={(e) => setNewItemUnit(e.target.value)}
            className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
          />
          <input
            type="number"
            placeholder="Quantity"
            value={newItemQty}
            onChange={(e) => setNewItemQty(Number(e.target.value))}
            className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
          />
          <input
            type="number"
            placeholder="Low alert threshold"
            value={newItemAlert}
            onChange={(e) => setNewItemAlert(Number(e.target.value))}
            className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
          />
          <button
            type="submit"
            className="py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md transition"
          >
            Add stock item
          </button>
        </form>
      </div>

      {/* Recipes (auto-deduction rules) matching video frame 1:28 */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <h3 className="font-bold text-gray-900 text-sm">Recipes (auto-deduction rules)</h3>
        <form onSubmit={handleSaveRecipe} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <select
            value={selectedDish}
            onChange={(e) => setSelectedDish(e.target.value)}
            className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
          >
            <option value="">Select dish...</option>
            {menuItems.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <select
            value={selectedIngredient}
            onChange={(e) => setSelectedIngredient(e.target.value)}
            className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
          >
            <option value="">Select ingredient...</option>
            {inventory.map((inv) => (
              <option key={inv.id} value={inv.id}>{inv.item_name} ({inv.unit})</option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Qty per serving"
            value={qtyPerServing}
            onChange={(e) => setQtyPerServing(Number(e.target.value))}
            className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
          />

          <button
            type="submit"
            className="py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Save recipe</span>
          </button>
        </form>

        {recipes.length > 0 && (
          <div className="mt-3 space-y-1.5 text-xs pt-3 border-t border-gray-100">
            {recipes.map((rec) => (
              <div key={rec.id} className="p-2 bg-gray-50 rounded-lg flex justify-between font-medium">
                <span>{rec.dish_name} ➔ Deducts {rec.qty_per_serving} {rec.unit} of {rec.ingredient_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
