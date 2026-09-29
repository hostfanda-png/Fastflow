import React from 'react';
import { Restaurant } from '../../types';
import { useApp } from '../../context/AppContext';
import { Star, Clock, Bike, ShieldCheck } from 'lucide-react';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick: () => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, onClick }) => {
  const { formatCurrency } = useApp();

  return (
    <article
      onClick={onClick}
      className="group cursor-pointer bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-full"
    >
      {/* Visual Cover Asset */}
      <div className="relative aspect-[16/10] overflow-hidden bg-stone-100">
        <img
          src={restaurant.coverImage}
          alt={restaurant.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer"
        />

        {/* Ambient bottom scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent" />

        {/* Opening Status Badge */}
        {!restaurant.isOpen && (
          <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center">
            <span className="text-xs font-semibold text-white uppercase tracking-wider bg-stone-900/90 px-3 py-1 rounded-md">
              Currently Closed
            </span>
          </div>
        )}

        {/* Discount Tag (Single subtle text marker, no badge sandwiches) */}
        {restaurant.discountBadge && restaurant.isOpen && (
          <div className="absolute top-3 left-3 bg-amber-500 text-stone-950 text-[11px] font-bold px-2 py-0.5 rounded shadow-sm">
            {restaurant.discountBadge}
          </div>
        )}

        {/* Delivery Time Overlay */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs text-white font-medium">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono tabular-nums">{restaurant.estimatedDeliveryTime}</span>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Header Row: Title & Rating */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold text-stone-900 group-hover:text-amber-600 transition-colors line-clamp-1">
              {restaurant.name}
            </h3>

            <div className="flex items-center gap-1 text-xs font-semibold text-stone-800 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-mono tabular-nums">{restaurant.rating.toFixed(1)}</span>
              <span className="text-[10px] text-stone-400 font-normal">({restaurant.reviewCount})</span>
            </div>
          </div>

          {/* Description */}
          <p className="mt-1 text-xs text-stone-500 line-clamp-2 leading-relaxed">
            {restaurant.description}
          </p>
        </div>

        {/* Metadata Footer: Clean unboxed text with typographic separators (NO PILLS) */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-stone-700 font-medium truncate">{restaurant.cuisines[0]}</span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span className="truncate">{restaurant.area}</span>
          </div>

          <div className="flex items-center gap-1 font-mono tabular-nums text-stone-700 font-semibold shrink-0">
            <Bike className="w-3.5 h-3.5 text-stone-400" />
            <span>{restaurant.deliveryFee === 0 ? 'Free' : formatCurrency(restaurant.deliveryFee)}</span>
          </div>
        </div>

      </div>
    </article>
  );
};
