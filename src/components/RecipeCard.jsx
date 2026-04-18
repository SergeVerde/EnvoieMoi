'use client';

import { timeAgo } from '@/lib/i18n';

const tagEmoji = {мясо:'🥩',курица:'🍗',рыба:'🐟',суп:'🍲',салат:'🥗',паста:'🍝',десерт:'🍰',выпечка:'🧁',завтрак:'🍳',напиток:'🥤',вегетарианское:'🌿',острое:'🌶️',быстрое:'⚡',meat:'🥩',chicken:'🍗',fish:'🐟',soup:'🍲',salad:'🥗',dessert:'🍰',breakfast:'🍳',spicy:'🌶️',quick:'⚡'};
function getEmoji(tags) { for (const t of (tags||[])) { const l=t.toLowerCase(); for (const[k,v] of Object.entries(tagEmoji)) if(l.includes(k)) return v; } return '🍽️'; }
const bgColors = ['#f0fdf4','#fef9ee','#fff0f0','#f0f7ff','#fdf4ff','#f0fdfa'];
function getBg(id) { return bgColors[Math.abs([...id].reduce((a,c)=>a+c.charCodeAt(0),0)) % bgColors.length]; }

export default function RecipeCard({ recipe, lang, liked, faved, onOpen, onLike, onFav, onShare }) {
  const r = recipe;
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer active:scale-[0.99] transition-transform" onClick={onOpen}>
      {/* Hero */}
      {r.main_photo_url ? (
        <div className="h-44 bg-cover bg-center" style={{ backgroundImage: `url(${r.main_photo_url})` }} />
      ) : (
        <div className="h-44 flex items-center justify-center text-6xl" style={{ background: getBg(r.id) }}>
          {getEmoji(r.tags)}
        </div>
      )}

      {/* Body */}
      <div className="p-4 pb-2">
        <h3 className="font-display text-lg font-bold mb-1 leading-snug">{r.title}</h3>
        {r.description && <p className="text-xs text-gray-400 mb-2.5 line-clamp-2 leading-relaxed">{r.description}</p>}

        {/* Badges */}
        {((r.dish_type && (Array.isArray(r.dish_type) ? r.dish_type.length > 0 : true)) ||
          (r.dietary && (r.dietary || []).length > 0) ||
          r.cuisine) && (
          <div className="flex gap-1.5 flex-wrap mb-2.5">
            {(Array.isArray(r.dish_type) ? r.dish_type : r.dish_type ? [r.dish_type] : []).slice(0,2).map(dt => (
              <span key={dt} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-light text-brand font-semibold border border-brand/20">{dt}</span>
            ))}
            {(r.dietary || []).slice(0,1).map(d => (
              <span key={d} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">{d}</span>
            ))}
            {r.cuisine && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold border border-blue-100">{r.cuisine}</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-400">
          {r.author_avatar ? (
            <img src={r.author_avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
              {(r.author_name || r.author_username || '?')[0].toUpperCase()}
            </div>
          )}
          <span className="font-medium">{r.author_name || r.author_username}</span>
          <span className="text-gray-300">·</span>
          <span>{timeAgo(r.created_at, lang)}</span>
        </div>

        {(r.tags||[]).length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-2.5">
            {r.tags.slice(0, 4).map(tag => <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">{tag}</span>)}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 pb-3.5 pt-1">
        <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 p-1" onClick={stop(onLike)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={liked?'#e74c3c':'none'} stroke={liked?'#e74c3c':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          {r.likes_count || 0}
        </button>
        <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 p-1" onClick={stop(onFav)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={faved?'#f59e0b':'none'} stroke={faved?'#f59e0b':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
        <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 p-1" onClick={stop(onShare)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
        {r.comments_count > 0 && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {r.comments_count}
          </span>
        )}
      </div>
    </div>
  );
}
