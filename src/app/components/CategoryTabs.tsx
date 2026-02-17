'use client';

import { Category } from '@/types';

interface CategoryTabsProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export function CategoryTabs({ categories, selectedCategory, onSelectCategory }: CategoryTabsProps) {
  return (
    <div className="sticky top-[65px] z-40 bg-twitch-dark border-b border-gray-800">
      <div className="flex items-center gap-2 px-6 py-3 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => onSelectCategory(null)}
          className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
            selectedCategory === null
              ? 'bg-twitch-purple text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          All
        </button>
        <button
          onClick={() => onSelectCategory('live')}
          className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
            selectedCategory === 'live'
              ? 'bg-red-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Live
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              selectedCategory === category.id
                ? 'bg-twitch-purple text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
