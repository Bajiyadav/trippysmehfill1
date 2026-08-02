import React from 'react';
import { FoodCategory } from '../../types';
import { Utensils, Flame, Pizza, Cake, Sun, Ham, Leaf, Drumstick } from 'lucide-react';

interface CategoryPillsProps {
  selectedCategory: FoodCategory;
  onSelectCategory: (cat: FoodCategory) => void;
}

const categoryIcons: Record<FoodCategory, React.ReactNode> = {
  All: <Utensils className="w-4 h-4" />,
  Biryani: <Flame className="w-4 h-4 text-orange-500" />,
  Pizza: <Pizza className="w-4 h-4 text-amber-500" />,
  Desserts: <Cake className="w-4 h-4 text-pink-500" />,
  'South Indian': <Sun className="w-4 h-4 text-yellow-600" />,
  Burgers: <Ham className="w-4 h-4 text-red-500" />,
  Veg: <Leaf className="w-4 h-4 text-emerald-600" />,
  'Non-Veg': <Drumstick className="w-4 h-4 text-red-600" />
};

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  selectedCategory,
  onSelectCategory
}) => {
  const categories: FoodCategory[] = ['All', 'Biryani', 'Pizza', 'Desserts', 'South Indian', 'Burgers', 'Veg', 'Non-Veg'];

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-3 min-w-max justify-start sm:justify-center">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all shadow-sm ${
                isSelected
                  ? 'bg-[#C5A059] text-black font-extrabold shadow-lg shadow-[#C5A059]/20 scale-105'
                  : 'bg-[#121212] text-gray-300 hover:bg-white/5 border border-white/10'
              }`}
            >
              <span>{categoryIcons[cat]}</span>
              <span>{cat}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
