'use client';

import { useState, useEffect } from 'react';
import { t, timeAgo } from '@/lib/i18n';

function fmtTimer(s) {
  if (s >= 3600) return Math.floor(s/3600) + 'ч ' + Math.floor((s%3600)/60) + 'мин';
  if (s >= 60) return Math.floor(s/60) + ' мин';
  return s + ' сек';
}

export default function RecipeDetail({ recipeId, supabase, user, lang, liked, faved, onLike, onFav, onBack, onOpenProfile, showToast }) {
  const [recipe, setRecipe] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [mainPhoto, setMainPhoto] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [mult, setMult] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [recipeId]);

  async function load() {
    setLoading(true);
    const [recipeRes, photosRes, commentsRes] = await Promise.all([
      supabase.from('recipes_feed').select('*').eq('id', recipeId).single(),
      supabase.from('recipe_photos').select('*').eq('recipe_id', recipeId).order('sort_order'),
      supabase.from('comments').select('*, profiles(username, display_name, avatar_url)').eq('recipe_id', recipeId).order('created_at', { ascending: true }),
    ]);
    if (recipeRes.data) {
      setRecipe(recipeRes.data);
      setMainPhoto(recipeRes.data.main_photo_url);
    }
    setPhotos(photosRes.data || []);
    setComments(commentsRes.data || []);
    setLoading(false);
  }

  async function addComment() {
    if (!newComment.trim()) return;
    await supabase.from('comments').insert({ recipe_id: recipeId, user_id: user.id, text: newComment.trim() });
    setNewComment('');
    load();
  }

  async function deleteComment(id) {
    await supabase.from('comments').delete().eq('id', id);
    setComments(comments.filter(c => c.id !== id));
  }

  function doShare() {
    const txt = `🍽️ ${recipe.title}\n${recipe.description || ''}`;
    if (navigator.share) navigator.share({ title: recipe.title, text: txt });
    else { navigator.clipboard.writeText(txt); showToast(t(lang, 'copied')); }
  }

  if (loading) return (
    <div className="max-w-md mx-auto min-h-screen flex items-center justify-center">
      <div className="w-9 h-9 border-3 border-gray-200 border-t-brand rounded-full animate-spin" />
    </div>
  );

  if (!recipe) return null;

  const r = recipe;
  const base = r.servings || 4;
  const cur = Math.max(1, Math.round(base * mult));

  return (
    <div className="max-w-md mx-auto min-h-screen pb-6">
      {/* Header */}
      <div className="sticky top-0 bg-[#faf8f5] z-50 border-b border-gray-200 px-5 py-4 flex items-center justify-between">
        <button className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center" onClick={onBack}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="font-display text-xl font-extrabold gradient-text">{t(lang, 'recipe')}</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 pt-4">
        {/* Main photo */}
        {mainPhoto ? (
          <div className="h-52 rounded-2xl mb-5 bg-cover bg-center" style={{ backgroundImage: `url(${mainPhoto})` }} />
        ) : (
          <div className="h-52 rounded-2xl mb-5 flex items-center justify-center text-7xl" style={{ background: '#fef3e2' }}>🍽️</div>
        )}

        {/* Gallery */}
        {photos.length > 1 && (
          <div className="flex gap-2 mb-5 overflow-x-auto hide-scrollbar">
            {photos.map(p => (
              <img key={p.id} src={p.url} alt="" className="h-40 rounded-xl object-cover flex-shrink-0 cursor-pointer" onClick={() => setMainPhoto(p.url)} />
            ))}
          </div>
        )}

        <h2 className="font-display text-2xl font-extrabold mb-1">{r.title}</h2>
        {r.description && <p className="text-sm text-gray-500 mb-4">{r.description}</p>}

        {/* Meta */}
        <div className="flex gap-3 mb-5 flex-wrap">
          {r.prep_time && <span className="flex items-center gap-1.5 text-xs text-gray-500">🔪 {r.prep_time}</span>}
          {r.cook_time && <span className="flex items-center gap-1.5 text-xs text-gray-500">⏱ {r.cook_time}</span>}
          <span className="text-xs text-gray-500">{cur} {t(lang, 'serv')}</span>
          {r.calories && <span className="text-xs text-gray-500">🔥 {r.calories} {t(lang, 'kcal')}</span>}
          <button className="flex items-center gap-1 text-xs text-gray-500" onClick={() => onOpenProfile(r.user_id)}>
            {r.author_avatar ? <img src={r.author_avatar} alt="" className="w-4 h-4 rounded-full" /> : null}
            {r.author_name || r.author_username}
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-500" onClick={onLike}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={liked?'#e74c3c':'none'} stroke={liked?'#e74c3c':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {r.likes_count || 0}
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-500" onClick={onFav}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={faved?'#f59e0b':'none'} stroke={faved?'#f59e0b':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            {faved ? t(lang, 'inFav') : t(lang, 'toFav')}
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-500" onClick={doShare}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            {t(lang, 'share')}
          </button>
        </div>

        {/* Servings control */}
        <div className="flex items-center gap-3 mb-4 p-3 bg-white rounded-xl border border-gray-200">
          <span className="text-sm font-semibold">{t(lang, 'servings')}:</span>
          <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center font-bold text-lg" onClick={() => setMult(m => Math.max(0.5, m - 0.5))}>−</button>
          <span className="text-lg font-extrabold min-w-[24px] text-center">{cur}</span>
          <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center font-bold text-lg" onClick={() => setMult(m => m + 0.5)}>+</button>
        </div>

        {/* Ingredients */}
        <h3 className="font-display text-lg font-bold mb-3">{t(lang, 'ingredients')}</h3>
        <div className="mb-6">
          {(r.ingredients || []).map((ing, i) => {
            const amt = ing.amount ? Math.round(ing.amount * mult * 100) / 100 : '';
            return (
              <div key={i} className="flex items-center gap-2.5 py-2.5 border-b border-dashed border-gray-200 text-sm">
                <span className="font-bold min-w-[60px] text-amber-700">{amt} {ing.unit || ''}</span>
                <span>{ing.name}</span>
              </div>
            );
          })}
        </div>

        {/* Steps */}
        <h3 className="font-display text-lg font-bold mb-3">{t(lang, 'steps')}</h3>
        <div className="flex flex-col gap-4 mb-6">
          {(r.steps || []).map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-800 text-white flex items-center justify-center font-extrabold text-sm flex-shrink-0">{i + 1}</div>
              <div className="flex-1">
                {step.title && <div className="font-bold text-sm mb-1">{step.title}</div>}
                <div className="text-sm text-gray-500 leading-relaxed">{step.content}</div>
                {step.timer_seconds && (
                  <span className="inline-flex items-center gap-1 text-xs text-brand font-semibold mt-1.5 px-2.5 py-0.5 bg-amber-50 rounded-lg">
                    ⏱ {fmtTimer(step.timer_seconds)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Tips */}
        {r.tips && (
          <>
            <h3 className="font-display text-lg font-bold mb-3">{t(lang, 'tips')}</h3>
            <div className="bg-yellow-50 rounded-xl p-3.5 text-sm text-yellow-800 leading-relaxed mb-6">{r.tips}</div>
          </>
        )}

        {/* Comments */}
        <h3 className="font-display text-lg font-bold mb-3">{t(lang, 'comments')} ({comments.length})</h3>

        <div className="flex gap-2 mb-4">
          <input
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand bg-white"
            placeholder={t(lang, 'addComment')}
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addComment()}
          />
          <button
            className="px-4 py-2.5 gradient-btn text-white rounded-xl text-sm font-bold disabled:opacity-50"
            disabled={!newComment.trim()}
            onClick={addComment}
          >{t(lang, 'send')}</button>
        </div>

        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">{t(lang, 'noComments')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {comments.map(c => (
              <div key={c.id} className="bg-white rounded-xl p-3 border border-gray-100">
                <div className="flex items-center gap-2 mb-1.5">
                  {c.profiles?.avatar_url ? (
                    <img src={c.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                      {(c.profiles?.display_name || c.profiles?.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-bold">{c.profiles?.display_name || c.profiles?.username}</span>
                  <span className="text-xs text-gray-400">{timeAgo(c.created_at, lang)}</span>
                  {c.user_id === user.id && (
                    <button className="ml-auto text-xs text-red-400 font-semibold" onClick={() => deleteComment(c.id)}>
                      {t(lang, 'deleteComment')}
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-600">{c.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
