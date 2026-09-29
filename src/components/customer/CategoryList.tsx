import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Utensils, 
  Pizza, 
  Sandwich, 
  Fish, 
  Flame, 
  Beef, 
  Cake, 
  Coffee 
} from 'lucide-react';

interface CategoryListProps {
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
}

export const CategoryList: React.FC<CategoryListProps> = ({
  selectedCategory,
  onSelectCategory
}) => {
  const { categories } = useApp();

  const getCategoryIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Pizza': return <Pizza className="w-4 h-4" />;
      case 'Sandwich': return <Sandwich className="w-4 h-4" />;
      case 'Fish': return <Fish className="w-4 h-4" />;
      case 'Flame': return <Flame className="w-4 h-4" />;
      case 'Beef': return <Beef className="w-4 h-4" />;
      case 'Cake': return <Cake className="w-4 h-4" />;
      case 'Coffee': return <Coffee className="w-4 h-4" />;
      default: return <Utensils className="w-4 h-4" />;
    }
  };

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900 tracking-tight">Browse by Cuisine</h2>
          <p className="text-xs text-stone-500">Filter menus by artisanal specialty</p>
        </div>
      </div>

      {/* Horizontal scrolling segmented tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                  : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 border-stone-200'
              }`}
            >
              <span className={isSelected ? 'text-amber-400' : 'text-stone-400'}>
                {getCategoryIcon(cat.icon)}
              </span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
