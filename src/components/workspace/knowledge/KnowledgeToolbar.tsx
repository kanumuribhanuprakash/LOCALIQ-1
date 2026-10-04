import React from 'react';
import { Search, Filter, ArrowUpDown, X, LayoutGrid, List } from 'lucide-react';
import { FileCategory } from '../../../types';

export type SortOption = 'newest' | 'oldest' | 'name' | 'size';

interface KnowledgeToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: 'all' | FileCategory;
  onSelectCategory: (cat: 'all' | FileCategory) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  categoryCounts: {
    all: number;
    document: number;
    image: number;
    audio: number;
  };
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
}

export const KnowledgeToolbar: React.FC<KnowledgeToolbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  sortBy,
  onSortChange,
  categoryCounts,
  viewMode,
  onViewModeChange,
}) => {
  const categories: { id: 'all' | FileCategory; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: categoryCounts.all },
    { id: 'document', label: 'Documents', count: categoryCounts.document },
    { id: 'image', label: 'Images', count: categoryCounts.image },
    { id: 'audio', label: 'Audio', count: categoryCounts.audio },
  ];

  return (
    <div className="space-y-3 select-none">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        
        {/* Category Filters Chips */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#091522] border border-cyan-500/20 overflow-x-auto no-scrollbar shrink-0">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                id={`filter-cat-${cat.id}`}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-black/30 text-white' : 'bg-[#050C14] text-slate-400'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Section: Search + Sort + Layout Toggle */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          
          {/* Search Bar with "Search knowledge..." */}
          <div className="relative flex-1 sm:w-64 lg:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              id="knowledge-search-input"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search knowledge..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-[#091522] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#091522] border border-white/10 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select
              id="knowledge-sort-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer pr-2 font-mono"
            >
              <option value="newest" className="bg-[#08121D] text-white">Date (Newest)</option>
              <option value="oldest" className="bg-[#08121D] text-white">Date (Oldest)</option>
              <option value="name" className="bg-[#08121D] text-white">Name (A-Z)</option>
              <option value="size" className="bg-[#08121D] text-white">Size (Largest)</option>
            </select>
          </div>

          {/* View Mode Switcher (Grid / List) */}
          <div className="flex items-center p-1 rounded-xl bg-[#091522] border border-white/10">
            <button
              id="view-mode-grid"
              onClick={() => onViewModeChange('cards')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              id="view-mode-list"
              onClick={() => onViewModeChange('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
