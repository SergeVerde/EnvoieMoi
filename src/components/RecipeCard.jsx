'use client';

import { timeAgo } from '@/lib/i18n';

const tagEmoji = {мясо:'🥩',курица:'🍗',рыба:'🐟',суп:'🍲',салат:'🥗',паста:'🍝',десерт:'🍰',выпечка:'🧁',завтрак:'🍳',напиток:'🥤',вегетарианское:'🌿',острое:'🌶️',быстрое:'⚡',meat:'🥩',chicken:'🍗',fish:'🐟',soup:'🍲',salad:'🥗',dessert:'🍰',breakfast:'🍳',spicy:'🌶️',quick:'⚡'};
function getEmoji(tags) { for (const t of (tags||[])) { const l=t.toLowerCase(); for (const[k,v] of Object.entries(tagEmoji)) if(l.includes(k)) return v; } return '🍽️'; }
const bgColors = ['#fef3e2','#e8f5e9','#fce4ec','#e3f2fd','#fff3e0','#f3e5f5','#e0f2f1','#fff8e1'];
function getBg(id) { return bgColors[Math.abs([...id].reduce((a,c)=>a+c.charCodeAt(0),0)) % bgColors.length]; }

export default function RecipeCard({ recipe, lang, liked, faved, onOpen, onLike, onFav, onShare }) {
  const r = recipe;
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer hover:-translate-y-0.5 transition-transform" onClick={onOpen}>
      {/* Hero */}
      {r.main_photo_url ? (
        <div className="h-36 bg-cover bg-center" style={{ backgroundImage: `url(${r.main_photo_url})` }} />
      ) : (
        <div className="h-36 flex items-center justify-center text-6xl" style={{ background: getBg(r.id) }}>
          {getEmoji(r.tags)}
        </div>
      )}

      {/* Body */}
      <div className="p-4">
        <h3 className="font-display text-lg font-bold mb-1">{r.title}</h3>
        {r.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{r.description}</p>}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {r.author_avatar ? (
            <img src={r.author_avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          )}
          <span>{r.author_name || r.author_username}</span>
          <span>{timeAgo(r.created_at, lang)}</span>
        </div>
        {(r.tags||[]).length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-2.5">
            {r.tags.map(tag => <span key={tag} className="text-[11px] px-2.5 py-0.5 rounded-lg bg-gray-100 text-gray-500 font-semibold">{tag}</span>)}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 pb-3">
        <button className="flex items-center gap-1 text-xs font-semibold text-gray-400 p-1" onClick={stop(onLike)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={liked?'#e74c3c':'none'} stroke={liked?'#e74c3c':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          {r.likes_count || 0}
        </button>
        <button className="flex items-center gap-1 text-xs font-semibold text-gray-400 p-1" onClick={stop(onFav)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={faved?'#f59e0b':'none'} stroke={faved?'#f59e0b':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
        <button className="flex items-center gap-1 text-xs font-semibold text-gray-400 p-1" onClick={stop(onShare)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
        {r.comments_count > 0 && (
          <span className="text-xs text-gray-400">💬 {r.comments_count}</span>
        )}
      </div>
    </div>
  );
}
