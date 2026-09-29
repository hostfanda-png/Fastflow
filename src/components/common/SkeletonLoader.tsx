import React from 'react';

interface SkeletonProps {
  type?: 'card' | 'row' | 'menu-item' | 'banner';
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({ type = 'card', count = 1 }) => {
  const items = Array.from({ length: count }, (_, i) => i);

  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((key) => (
          <div key={key} className="bg-white rounded-2xl border border-stone-200 overflow-hidden p-4 space-y-3 animate-pulse">
            <div className="w-full aspect-[16/10] bg-stone-200 rounded-xl" />
            <div className="h-4 bg-stone-200 rounded w-3/4" />
            <div className="h-3 bg-stone-200 rounded w-1/2" />
            <div className="flex justify-between pt-2">
              <div className="h-3 bg-stone-200 rounded w-1/3" />
              <div className="h-3 bg-stone-200 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'row') {
    return (
      <div className="space-y-3">
        {items.map((key) => (
          <div key={key} className="p-4 bg-white rounded-xl border border-stone-200 flex items-center justify-between animate-pulse">
            <div className="space-y-2 flex-1 pr-4">
              <div className="h-4 bg-stone-200 rounded w-1/3" />
              <div className="h-3 bg-stone-200 rounded w-1/2" />
            </div>
            <div className="h-6 bg-stone-200 rounded w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((key) => (
        <div key={key} className="p-4 bg-white rounded-2xl border border-stone-200 flex items-center justify-between animate-pulse gap-4">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-stone-200 rounded w-1/2" />
            <div className="h-3 bg-stone-200 rounded w-3/4" />
            <div className="h-3 bg-stone-200 rounded w-1/4" />
          </div>
          <div className="w-24 h-24 bg-stone-200 rounded-xl shrink-0" />
        </div>
      ))}
    </div>
  );
};
