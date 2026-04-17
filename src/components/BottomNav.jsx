'use client';

import { t } from '@/lib/i18n';

export default function BottomNav({ screen, lang, onFeed, onFavs, onAdd, onMessages, onProfile }) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md flex justify-around items-end py-2 pb-[max(8px,env(safe-area-inset-bottom))] bg-white/95 backdrop-blur border-t border-gray-100 z-50">
      <button
        className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold px-2 py-1 ${screen === 'feed' ? 'text-green-600' : 'text-gray-400'}`}
        onClick={onFeed}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill={screen === 'feed' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
        {t(lang, 'feed')}
      </button>

      <button
        className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold px-2 py-1 ${screen === 'favorites' ? 'text-amber-500' : 'text-gray-400'}`}
        onClick={onFavs}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill={screen === 'favorites' ? '#f59e0b' : 'none'} stroke={screen === 'favorites' ? '#f59e0b' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        {t(lang, 'favs')}
      </button>

      <button
        className="flex flex-col items-center gap-0.5 text-[10px] font-semibold px-2 py-1"
        onClick={onAdd}
      >
        <div className="w-12 h-12 rounded-2xl gradient-btn flex items-center justify-center -mt-6 shadow-lg shadow-green-700/20">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
      </button>

      <button
        className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold px-2 py-1 ${screen === 'messages' ? 'text-green-600' : 'text-gray-400'}`}
        onClick={onMessages}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill={screen === 'messages' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {t(lang, 'messages')}
      </button>

      <button
        className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold px-2 py-1 ${screen === 'profile' ? 'text-green-600' : 'text-gray-400'}`}
        onClick={onProfile}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {t(lang, 'profile')}
      </button>
    </div>
  );
}
