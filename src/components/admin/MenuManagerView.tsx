import React, { useState } from 'react';
import { MenuItem } from '../../types';
import { Plus, Edit3, Trash2, X, Check, Upload, Image as ImageIcon } from 'lucide-react';

interface MenuManagerViewProps {
  menuItems: MenuItem[];
  onSaveDish: (dish: MenuItem) => void;
  onDeleteDish: (dishId: string) => void;
  onToggleAvailable: (dishId: string) => void;
  onToggleSpecial: (dishId: string) => void;
}

export const MenuManagerView: React.FC<MenuManagerViewProps> = ({
  menuItems,
  onSaveDish,
  onDeleteDish,
  onToggleAvailable,
  onToggleSpecial
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Partial<MenuItem> | null>(null);

  const handleOpenAdd = () => {
    setEditingDish({
      id: 'm-' + Date.now(),
      name: '',
      description: '',
      price: 100,
      category: 'Biryani',
      image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80',
      is_veg: false,
      is_available: true,
      is_todays_special: false,
      display_order: menuItems.length + 1
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dish: MenuItem) => {
    setEditingDish({ ...dish });
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDish || !editingDish.name) return;
    onSaveDish(editingDish as MenuItem);
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 font-serif">Menu</h1>
          <p className="text-xs text-gray-500">Enabled dishes show up on the customer page instantly.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-orange-600/30 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add dish</span>
        </button>
      </div>

      {/* Menu Dish Cards Grid matching video frame 0:52 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {menuItems.map((dish) => (
          <div
            key={dish.id}
            className="bg-white rounded-2xl p-5 border border-orange-100 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition"
          >
            <div>
              <div className="flex gap-3 mb-2">
                <img
                  src={dish.image_url}
                  alt={dish.name}
                  className="w-20 h-20 rounded-xl object-cover shrink-0 border border-gray-100 shadow-sm"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      dish.is_veg ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {dish.is_veg ? 'VEG' : 'NON VEG'}
                    </span>
                    <span className="text-base font-black text-gray-900">₹{dish.price}</span>
                  </div>
                  <h3 className="font-extrabold text-gray-900 text-sm line-clamp-1">{dish.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">{dish.description}</p>
                </div>
              </div>

              {/* Toggles Bar */}
              <div className="pt-3 border-t border-gray-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700">Available</span>
                  <button
                    onClick={() => onToggleAvailable(dish.id)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      dish.is_available ? 'bg-emerald-500 justify-end' : 'bg-gray-300 justify-start'
                    }`}
                  >
                    <span className="bg-white w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700">Today's special</span>
                  <button
                    onClick={() => onToggleSpecial(dish.id)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      dish.is_todays_special ? 'bg-orange-600 justify-end' : 'bg-gray-300 justify-start'
                    }`}
                  >
                    <span className="bg-white w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => handleOpenEdit(dish)}
                className="py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => onDeleteDish(dish.id)}
                className="py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Add Dish Modal matching video frame 1:02 */}
      {isModalOpen && editingDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-orange-100">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-orange-50/50">
              <h2 className="text-lg font-bold text-gray-900">
                {editingDish.id?.startsWith('m-') ? 'Add new dish' : 'Edit dish'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Name</label>
                <input
                  type="text"
                  value={editingDish.name || ''}
                  onChange={(e) => setEditingDish({ ...editingDish, name: e.target.value })}
                  required
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingDish.description || ''}
                  onChange={(e) => setEditingDish({ ...editingDish, description: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={editingDish.price || 0}
                    onChange={(e) => setEditingDish({ ...editingDish, price: Number(e.target.value) })}
                    required
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Category</label>
                  <select
                    value={editingDish.category || 'Biryani'}
                    onChange={(e) => setEditingDish({ ...editingDish, category: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500"
                  >
                    <option value="Biryani">Biryani</option>
                    <option value="South Indian">South Indian</option>
                    <option value="Veg">Veg</option>
                    <option value="Non-Veg">Non-Veg</option>
                    <option value="Pizza">Pizza</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Image URL</label>
                <input
                  type="text"
                  value={editingDish.image_url || ''}
                  onChange={(e) => setEditingDish({ ...editingDish, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingDish.is_veg || false}
                    onChange={(e) => setEditingDish({ ...editingDish, is_veg: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <span>Veg Dish</span>
                </label>

                <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingDish.is_todays_special || false}
                    onChange={(e) => setEditingDish({ ...editingDish, is_todays_special: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <span>Today's Special</span>
                </label>
              </div>

              <div className="pt-4 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 shadow-md"
                >
                  Save Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
