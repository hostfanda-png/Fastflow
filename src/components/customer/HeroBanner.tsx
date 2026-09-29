import React from 'react';
import { useApp } from '../../context/AppContext';
import { Search, MapPin, Sparkles, Clock, ArrowRight } from 'lucide-react';

interface HeroBannerProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onExploreClick: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ 
  searchQuery, 
  setSearchQuery, 
  onExploreClick 
}) => {
  const { selectedCity, selectedArea, restaurants } = useApp();

  return (
    <div className="relative overflow-hidden bg-stone-900 rounded-3xl mb-12 shadow-xl border border-stone-800">
      {/* Background Image with Measured Contrast Scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src="/src/assets/images/hero_culinary_spread_1790680487264.jpg"
          alt="Curated culinary spread"
          className="w-full h-full object-cover object-center filter brightness-90 scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-stone-950/80 to-stone-950/40" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 max-w-4xl px-6 py-16 sm:px-12 sm:py-20 lg:py-24">
        
        {/* Subtle kicker text (Anti-slop: clean unboxed text) */}
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 tracking-wide uppercase mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Independent Culinary Guild</span>
          <span aria-hidden="true">·</span>
          <span>Fast Thermal Dispatch</span>
        </div>

        {/* Display Headline with text-wrap: balance */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] max-w-2xl" style={{ textWrap: 'balance' }}>
          Real food from master kitchens, delivered piping hot.
        </h1>

        <p className="mt-4 text-sm sm:text-base text-stone-300 max-w-xl leading-relaxed">
          Order 72-hour slow-fermented Neapolitan pizzas, dry-aged beef smashes, and authentic hand-pressed sushi from top independent restaurants in {selectedArea}, {selectedCity}.
        </p>

        {/* Live Search & Quick Filter Box */}
        <div className="mt-8 max-w-xl">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-200">
            <div className="flex items-center gap-2.5 px-3 flex-1">
              <Search className="w-5 h-5 text-stone-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search woodfired pizza, smash burger, sushi, birria..."
                className="w-full py-2.5 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 bg-transparent focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-stone-400 hover:text-stone-700 px-1 font-mono"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              onClick={onExploreClick}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-colors whitespace-nowrap shrink-0"
            >
              <span>Explore Kitchens</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Search Suggestions */}
          <div className="mt-3 flex items-center gap-2 text-xs text-stone-300 flex-wrap">
            <span className="text-stone-400 text-[11px]">Popular searches:</span>
            {['Margherita Pizza', 'Double Smash', 'Norwegian Salmon', 'Birria Tacos'].map((tag) => (
              <button
                key={tag}
                onClick={() => setSearchQuery(tag)}
                className="text-stone-300 hover:text-white underline underline-offset-4 text-[11px] transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Trust Proof Metrics */}
        <div className="mt-10 pt-6 border-t border-white/10 flex items-center gap-6 sm:gap-10 text-xs text-stone-300">
          <div>
            <div className="text-base sm:text-lg font-bold text-white font-mono tabular-nums">
              {restaurants.length} Active Kitchens
            </div>
            <div className="text-stone-400 text-[11px]">Verified Hygiene Standards</div>
          </div>
          <div className="h-8 w-px bg-white/15" />
          <div>
            <div className="text-base sm:text-lg font-bold text-white font-mono tabular-nums">
              25-35 mins
            </div>
            <div className="text-stone-400 text-[11px]">Average Dispatch Time</div>
          </div>
          <div className="h-8 w-px bg-white/15 hidden sm:block" />
          <div className="hidden sm:block">
            <div className="text-base sm:text-lg font-bold text-white font-mono tabular-nums">
              4.9 / 5.0
            </div>
            <div className="text-stone-400 text-[11px]">Over 1,200 Customer Reviews</div>
          </div>
        </div>

      </div>
    </div>
  );
};
