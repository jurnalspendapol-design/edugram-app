import React, { useState } from 'react';
import { Leaf, MessageSquare, X } from 'lucide-react';
import { ECO_FACTS } from '../constants';

const BangEko = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentFact, setCurrentFact] = useState('');

  const showFact = () => {
    const randomFact = ECO_FACTS[Math.floor(Math.random() * ECO_FACTS.length)];
    setCurrentFact(randomFact);
    setIsOpen(true);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-72 bg-white rounded-2xl shadow-2xl border border-[#E5E0D8] p-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#8A9A5B] rounded-lg flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-sm">Bang Eko</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-[#F4F1EA] rounded-full transition-colors">
              <X className="w-4 h-4 text-[#A8A096]" />
            </button>
          </div>
          <div className="bg-[#F4F1EA] p-3 rounded-xl text-sm leading-relaxed text-[#4A4036] border border-[#E5E0D8]">
            {currentFact}
          </div>
          <div className="mt-3 text-[10px] text-[#A8A096] font-medium text-center italic">
            "Semangat terus ya, Eco-Influencer! 🌱"
          </div>
        </div>
      )}
      <button
        onClick={showFact}
        className="w-14 h-14 bg-[#8A9A5B] hover:bg-[#7A8A4B] text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group relative"
      >
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
        <MessageSquare className="w-7 h-7 group-hover:scale-110 transition-transform" />
      </button>
    </div>
  );
};

export default BangEko;
