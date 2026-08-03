import React, { useState, useEffect } from 'react';
import { GalleryItem } from '../../types';
import { ChevronLeft, ChevronRight, X, Maximize2, Sparkles, Play, Pause, Image as ImageIcon } from 'lucide-react';

interface GallerySectionProps {
  galleryItems: GalleryItem[];
}

export const GallerySection: React.FC<GallerySectionProps> = ({ galleryItems }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Auto slideshow timer when popup is open and playing
  useEffect(() => {
    let timer: any = null;
    if (selectedIndex !== null && isPlaying && galleryItems.length > 1) {
      timer = setInterval(() => {
        setSelectedIndex((prev) => (prev !== null ? (prev + 1) % galleryItems.length : 0));
      }, 3500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [selectedIndex, isPlaying, galleryItems.length]);

  if (!galleryItems || galleryItems.length === 0) return null;

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex - 1 + galleryItems.length) % galleryItems.length);
    }
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % galleryItems.length);
    }
  };

  const selectedItem = selectedIndex !== null ? galleryItems[selectedIndex] : null;

  return (
    <section id="gallery-section" className="py-12 bg-[#0d0d0d] border-t border-white/10 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        
        {/* Section Heading with Popup Launcher */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] text-xs font-bold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Visual Food Showcase</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-serif tracking-tight text-white">
              Gallery
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 max-w-xl">
              Click any image to view a full-screen with zoom and navigation.
            </p>
          </div>

          <div>
            <button
              onClick={() => setSelectedIndex(0)}
              className="px-5 py-2.5 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold text-xs rounded-2xl shadow-lg shadow-[#C5A059]/20 transition flex items-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Open Popup Showcase (1 by 1)</span>
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryItems.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => setSelectedIndex(idx)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl bg-[#121212] border border-white/10 hover:border-[#C5A059]/60 transition-all duration-300 shadow-xl hover:-translate-y-1"
            >
              <div className="aspect-video overflow-hidden bg-[#181818]">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-90 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-white text-sm sm:text-base font-serif group-hover:text-[#C5A059] transition-colors">
                      {item.title}
                    </h3>
                    {item.caption && (
                      <p className="text-xs text-gray-300 line-clamp-2 mt-1">
                        {item.caption}
                      </p>
                    )}
                  </div>
                  <div className="p-2 rounded-full bg-black/70 text-[#C5A059] group-hover:bg-[#C5A059] group-hover:text-black transition-all shrink-0">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Lightbox Interactive Popup Modal */}
      {selectedItem && (
        <div
          onClick={() => setSelectedIndex(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 transition-all duration-300"
        >
          {/* Top Bar Controls */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-20">
            <div className="flex items-center gap-2 bg-black/60 px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-mono font-bold">
              <ImageIcon className="w-4 h-4 text-[#C5A059]" />
              <span>Image {selectedIndex! + 1} of {galleryItems.length}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(!isPlaying);
                }}
                className={`p-2.5 rounded-full border transition flex items-center gap-1.5 text-xs font-bold ${
                  isPlaying
                    ? 'bg-[#C5A059] text-black border-[#C5A059]'
                    : 'bg-black/60 text-white border-white/20 hover:bg-white/20'
                }`}
                title={isPlaying ? 'Pause Auto Slideshow' : 'Play Auto Slideshow'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span className="hidden sm:inline">{isPlaying ? 'Slideshow Playing' : 'Slideshow Paused'}</span>
              </button>

              <button
                onClick={() => setSelectedIndex(null)}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                title="Close Lightbox"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Navigation Controls */}
          {galleryItems.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3.5 rounded-full bg-black/70 border border-white/20 hover:bg-[#C5A059] hover:text-black text-white transition z-20 shadow-2xl"
                title="Previous Image"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>

              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3.5 rounded-full bg-black/70 border border-white/20 hover:bg-[#C5A059] hover:text-black text-white transition z-20 shadow-2xl"
                title="Next Image"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            </>
          )}

          {/* Main Lightbox Content Card */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full bg-[#121212] border border-white/15 rounded-3xl overflow-hidden shadow-2xl space-y-0 transform transition-all scale-100 my-auto"
          >
            <div className="relative max-h-[65vh] bg-black flex items-center justify-center overflow-hidden p-2">
              <img
                src={selectedItem.image_url}
                alt={selectedItem.title}
                className="max-h-[65vh] w-auto object-contain mx-auto rounded-xl shadow-2xl"
              />
            </div>

            <div className="p-6 bg-[#121212] border-t border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold font-serif text-white">{selectedItem.title}</h3>
                  {selectedItem.caption && (
                    <p className="text-xs sm:text-sm text-gray-300 mt-1">{selectedItem.caption}</p>
                  )}
                </div>

                <div className="text-xs text-gray-500 font-mono shrink-0">
                  Published: {selectedItem.created_at}
                </div>
              </div>

              {/* Thumbnails Bar */}
              <div className="flex items-center gap-2.5 overflow-x-auto pt-2 border-t border-white/10 pb-1 scrollbar-none">
                {galleryItems.map((thumb, tIdx) => (
                  <button
                    key={thumb.id}
                    onClick={() => setSelectedIndex(tIdx)}
                    className={`relative w-16 h-12 shrink-0 rounded-xl overflow-hidden border-2 transition ${
                      tIdx === selectedIndex
                        ? 'border-[#C5A059] scale-105 shadow-md'
                        : 'border-white/10 opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img src={thumb.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

    </section>
  );
};
