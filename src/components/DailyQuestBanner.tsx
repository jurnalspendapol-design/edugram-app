import React from 'react';
import { Trophy } from 'lucide-react';
import { DAILY_QUESTS } from '../constants';

const DailyQuestBanner = () => {
  const today = new Date().getDay();
  const quest = DAILY_QUESTS[today];

  return (
    <div className="bg-gradient-to-r from-[#8A9A5B] to-[#7A8A4B] rounded-2xl p-4 mb-6 shadow-md border border-[#8A9A5B]/20 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-110 transition-transform"></div>
      <div className="relative z-10 flex items-center gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-xl backdrop-blur-sm flex items-center justify-center shadow-inner shrink-0">
          <Trophy className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-white/80 text-xs font-bold uppercase tracking-wider mb-0.5">Misi Hari Ini</h3>
          <p className="text-white font-bold text-sm sm:text-base leading-tight">{quest}</p>
        </div>
        <div className="ml-auto hidden sm:block">
          <div className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest border border-white/30">
            +15 XP
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyQuestBanner;
