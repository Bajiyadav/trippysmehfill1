import React from 'react';
import { Info } from 'lucide-react';
import { KitchenSettings } from '../../types';

interface ClosedHomepageBannerProps {
  settings: KitchenSettings;
  onOpenClosedModal?: () => void;
}

export const ClosedHomepageBanner: React.FC<ClosedHomepageBannerProps> = ({ settings, onOpenClosedModal }) => {
  if (settings.is_open) return null;

  return (
    <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-4 py-3 border-b border-blue-400/30 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <div className="p-1.5 rounded-full bg-blue-500/40 text-blue-200 shrink-0">
            <Info className="w-4 h-4 text-blue-200" />
          </div>
          <div>
            <span className="font-extrabold tracking-wide text-amber-300 uppercase mr-2">
              ℹ️ Restaurant is currently closed
            </span>
            <span className="text-blue-100 font-medium">
              Opening Time: <strong className="text-white font-mono">{settings.opening_time || '09:00 AM'}</strong> | Closing Time: <strong className="text-white font-mono">{settings.closing_time || '10:00 PM'}</strong> — Please come back during business hours.
            </span>
          </div>
        </div>

        {onOpenClosedModal && (
          <button
            onClick={onOpenClosedModal}
            className="px-3.5 py-1 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl text-[11px] transition shrink-0 border border-white/20 shadow-sm"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
};
