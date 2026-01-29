import React, { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw, BookOpen } from "lucide-react";

const FlashcardViewer = ({ data, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!data || !data.flashcards || data.flashcards.length === 0) return null;

  const cards = data.flashcards;
  const currentCard = cards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }, 150);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-4 animate-in fade-in zoom-in-95">
      {/* Header / Progress */}
      <div className="mb-6 flex items-center justify-between w-full max-w-lg">
        <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">
          Kaart {currentIndex + 1} / {cards.length}
        </span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 font-bold text-xs"
        >
          Sluiten
        </button>
      </div>

      {/* THE CARD */}
      <div
        className="relative w-full max-w-lg aspect-[3/2] cursor-pointer group perspective-1000"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={`w-full h-full transition-all duration-500 ease-in-out transform-style-3d relative ${
            isFlipped ? "rotate-y-180" : ""
          }`}
        >
          {/* FRONT */}
          <div className="absolute inset-0 backface-hidden bg-white rounded-3xl shadow-xl border-2 border-slate-100 flex flex-col items-center justify-center p-8 text-center hover:border-blue-300 transition-colors">
            <div className="mb-4 p-3 bg-blue-50 text-blue-600 rounded-full">
              <BookOpen size={24} />
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 leading-snug">
              {currentCard.front.text}
            </h3>
            <p className="absolute bottom-6 text-xs font-bold text-slate-400 uppercase animate-pulse">
              Klik om te draaien
            </p>
          </div>

          {/* BACK */}
          <div className="absolute inset-0 backface-hidden bg-slate-900 text-white rounded-3xl shadow-xl flex flex-col items-center justify-center p-8 text-center rotate-y-180">
            <div className="mb-4 p-3 bg-white/10 text-emerald-400 rounded-full">
              <RotateCw size={24} />
            </div>
            <h3 className="text-lg md:text-xl font-medium leading-relaxed">
              {currentCard.back.text}
            </h3>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-8 flex gap-4">
        <button
          onClick={handlePrev}
          className="p-4 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 shadow-sm transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={handleNext}
          className="px-8 py-4 rounded-full bg-blue-600 text-white font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
        >
          Volgende Kaart
        </button>
        <button
          onClick={handleNext}
          className="p-4 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 shadow-sm transition-all"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

// CSS Helper voor 3D effecten (plaats dit in je styles.css als het niet werkt, of gebruik deze inline style hack)
// De classes 'perspective-1000', 'transform-style-3d', 'backface-hidden', 'rotate-y-180' moeten in CSS bestaan.
// Voor nu voegen we een style block toe aan de component voor zekerheid.
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  .perspective-1000 { perspective: 1000px; }
  .transform-style-3d { transform-style: preserve-3d; }
  .backface-hidden { backface-visibility: hidden; }
  .rotate-y-180 { transform: rotateY(180deg); }
`;
document.head.appendChild(styleSheet);

export default FlashcardViewer;
