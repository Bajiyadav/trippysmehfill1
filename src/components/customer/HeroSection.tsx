import React, { useState } from 'react';
import { MapPin, Search, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedLocation: string;
  setSelectedLocation: (loc: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  setSearchQuery,
  selectedLocation,
  setSelectedLocation
}) => {
  const [isLocating, setIsLocating] = useState(false);

  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setSelectedLocation(`GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}) - Hyderabad Campus`);
          setIsLocating(false);
        },
        () => {
          setSelectedLocation('Goenka University Campus - Hostel Gate 5');
          setIsLocating(false);
        }
      );
    } else {
      setSelectedLocation('Main University Hostel');
      setIsLocating(false);
    }
  };

  return (
    <div className="relative bg-gradient-to-b from-[#0d0d0d] via-[#121212] to-[#080808] text-white py-12 px-4 sm:px-6 lg:px-8 overflow-hidden shadow-inner border-b border-white/10">
      {/* Decorative background overlay elements */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        
        {/* Subtitle Badge */}
        <div className="inline-flex items-center gap-2 bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-4 backdrop-blur-sm shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
          <span>Freshly cooked • Delivered hot</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-serif tracking-tight text-white mb-4 drop-shadow-md">
          Order food you love. Discover Hyderabad's <span className="text-[#C5A059]">best biryani</span>.
        </h1>

        {/* Location & Search Bar Box */}
        <div className="mt-8 bg-[#121212] backdrop-blur-md p-3 sm:p-4 rounded-2xl shadow-2xl text-gray-200 max-w-3xl mx-auto border border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            
            {/* Hostel / Location Input */}
            <div className="sm:col-span-5 relative">
              <div className="flex items-center gap-2 px-3 py-2 bg-[#181818] rounded-xl border border-white/10 focus-within:border-[#C5A059] transition">
                <MapPin className="w-4 h-4 text-[#C5A059] shrink-0" />
                <input
                  type="text"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  placeholder="Enter your hostel or address..."
                  className="w-full bg-transparent text-xs sm:text-sm font-medium text-white outline-none placeholder:text-gray-500"
                />
              </div>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="text-[11px] text-[#C5A059] hover:text-[#d4af65] font-bold underline mt-1 block text-left px-1"
              >
                {isLocating ? 'Fetching GPS...' : 'Use my current location'}
              </button>
            </div>

            {/* Food Search Input */}
            <div className="sm:col-span-7 relative">
              <div className="flex items-center gap-2 px-3 py-2 bg-[#181818] rounded-xl border border-white/10 focus-within:border-[#C5A059] transition">
                <Search className="w-4 h-4 text-gray-500 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search biryani, curries, dosas..."
                  className="w-full bg-transparent text-xs sm:text-sm font-medium text-white outline-none placeholder:text-gray-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-gray-400 hover:text-white font-bold px-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
