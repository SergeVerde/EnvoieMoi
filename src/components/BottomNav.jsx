'use client';

import { t } from '@/lib/i18n';

export default function BottomNav({ screen, lang, onFeed, onFavs, onAdd, onMessages, onProfile, unreadMessages = 0 }) {
  function NavItem({ id, activeColor, onClick, icon, label }) {
    const active = screen === id;
    return (
      <button
        className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all ${active ? activeColor || 'text-brand' : 'text-gray-400'}`}
        onClick={onClick}
      >
        {active && <div className="absolute inset-0 bg-current opacity-[0.08] rounded-2xl" />}
        <div className="relative">{icon(active)}</div>
        <span className="relative text-[10px] font-semibold">{label}</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[94%] max-w-[440px] z-50">
      <div className="flex items-center justify-around bg-white/80 backdrop-blur-2xl rounded-[28px] shadow-xl shadow-black/10 border border-white/60 px-1 py-1.5">

        <NavItem id="feed" label={t(lang, 'feed')} onClick={onFeed}
          icon={a => (
            <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          )}
        />

        <NavItem id="favorites" label={t(lang, 'favs')} onClick={onFavs} activeColor="text-amber-500"
          icon={a => (
            <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          )}
        />

        <button className="flex flex-col items-center gap-0.5" onClick={onAdd}>
          <div className="w-12 h-12 rounded-2xl gradient-btn flex items-center justify-center -mt-7 shadow-lg shadow-brand/30">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
        </button>

        <button
          className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all ${screen === 'messages' ? 'text-brand' : 'text-gray-400'}`}
          onClick={onMessages}
        >
          {screen === 'messages' && <div className="absolute inset-0 bg-current opacity-[0.08] rounded-2xl" />}
          <div className="relative">
            <svg width="22" height="22" viewBox="0 0 24 24" fill={screen === 'messages' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] px-0.5 bg-brand text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </div>
          <span className="relative text-[10px] font-semibold">{t(lang, 'messages')}</span>
        </button>

        <NavItem id="profile" label={t(lang, 'profile')} onClick={onProfile}
          icon={() => (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )}
        />

      </div>
    </div>
  );
}
