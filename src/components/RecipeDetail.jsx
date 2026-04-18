'use client';

import { useState, useEffect, useRef } from 'react';
import { t, timeAgo } from '@/lib/i18n';

function fmtTimer(s) {
  if (s >= 3600) return Math.floor(s/3600) + 'ч ' + Math.floor((s%3600)/60) + 'мин';
  if (s >= 60) return Math.floor(s/60) + ' мин';
  return s + ' сек';
}

function toArr(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : [String(v)]; } catch { return [String(v)]; }
}

export default function RecipeDetail({ recipeId, supabase, user, userProfile, lang, liked, faved, onLike, onFav, onBack, onOpenProfile, onEdit, onExport, onMessage, onTagClick, showToast }) {
  const [recipe, setRecipe] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [mainPhoto, setMainPhoto] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [mult, setMult] = useState(1);
  const [loading, setLoading] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const commentRef = useRef(null);

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
    await supabase.from('comments').insert({
      recipe_id: recipeId,
      user_id: user.id,
      text: newComment.trim(),
      parent_id: replyTo?.id || null,
    });
    setNewComment('');
    setReplyTo(null);
    load();
  }

  async function deleteComment(c) {
    const byMod = ['admin', 'creator'].includes(userProfile?.role) && c.user_id !== user.id;
    await supabase.from('comments').update({
      is_deleted: true,
      deleted_by_role: byMod ? userProfile.role : null,
    }).eq('id', c.id);
    setComments(prev => prev.map(x => x.id === c.id
      ? { ...x, is_deleted: true, deleted_by_role: byMod ? userProfile.role : null }
      : x));
  }

  function canDelete(c) {
    return c.user_id === user.id ||
      user.id === recipe?.user_id ||
      ['admin', 'creator'].includes(userProfile?.role);
  }

  function handleReply(comment) {
    const username = comment.profiles?.display_name || comment.profiles?.username;
    // Always attach reply to the root-level comment so all replies stay in one thread
    const parentId = comment.parent_id || comment.id;
    setReplyTo({ id: parentId, username });
    setNewComment(`@${username} `);
    setTimeout(() => commentRef.current?.focus(), 50);
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
  const mainPhotoObj = photos.find(p => p.is_main) || photos[0];
  const displayMain = mainPhoto || mainPhotoObj?.url;
  const isAuthor = user.id === r.user_id;
  const dishTypes = toArr(r.dish_type);
  const mealTimes = toArr(r.meal_time);
  const dietary = toArr(r.dietary);

  function tagChip(type, val, cls) {
    return (
      <button key={val} className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border ${cls}`} onClick={() => onTagClick?.(type, val)}>
        {val}
      </button>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen pb-6">
      {/* Lightbox */}
      {lightboxSrc && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center" onClick={() => setLightboxSrc(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white text-2xl z-10" onClick={() => setLightboxSrc(null)}>✕</button>
          <img src={lightboxSrc} alt="" className="max-w-full max-h-screen object-contain px-4" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 bg-[#f8f7f4] z-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
        <button className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center shadow-sm" onClick={onBack}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="font-display text-xl font-extrabold gradient-text">{t(lang, 'recipe')}</h1>
        {isAuthor && onEdit ? (
          <button className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center shadow-sm" onClick={() => onEdit(r)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        ) : <div className="w-10" />}
      </div>

      <div className="px-5 pt-4">
        {/* Main photo */}
        {displayMain ? (
          <div
            className="h-56 rounded-3xl mb-4 bg-cover bg-center cursor-pointer shadow-sm overflow-hidden"
            style={{ backgroundImage: `url(${displayMain})` }}
            onClick={() => setLightboxSrc(displayMain)}
          />
        ) : (
          <div className="h-56 rounded-3xl mb-4 flex items-center justify-center text-7xl shadow-sm overflow-hidden" style={{ background: '#f0fdf4' }}>🍽️</div>
        )}

        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-display text-2xl font-extrabold flex-1">{r.title}</h2>
          {Date.now() - new Date(r.created_at).getTime() < 3*24*60*60*1000 && (
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-brand text-white tracking-wide flex-shrink-0">NEW</span>
          )}
        </div>
        {r.description && <p className="text-sm text-gray-500 mb-3 leading-relaxed">{r.description}</p>}

        {/* Category badges (clickable) */}
        {(dishTypes.length > 0 || mealTimes.length > 0 || dietary.length > 0 || r.cuisine) && (
          <div className="flex gap-1.5 flex-wrap mb-2">
            {dishTypes.map(dt => tagChip('dish_type', dt, 'bg-brand-light text-brand border-brand/20'))}
            {mealTimes.map(mt => tagChip('meal_time', mt, 'bg-amber-50 text-amber-700 border-amber-100'))}
            {dietary.map(d => tagChip('dietary', d, 'bg-emerald-50 text-emerald-700 border-emerald-100'))}
            {r.cuisine && tagChip('cuisine', r.cuisine, 'bg-blue-50 text-blue-700 border-blue-100')}
          </div>
        )}

        {/* AI tags — small, italic */}
        {(r.tags || []).length > 0 && (
          <div className="flex gap-1 flex-wrap mb-4">
            {(r.tags || []).map(tg => (
              <button key={tg} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-300 italic border border-gray-100" onClick={() => onTagClick?.('tag', tg)}>
                {tg}
              </button>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="flex gap-3 mb-5 flex-wrap items-center">
          {r.prep_time && <span className="flex items-center gap-1 text-xs text-gray-500 bg-white px-2.5 py-1 rounded-lg border border-gray-100">🔪 {r.prep_time}</span>}
          {r.cook_time && <span className="flex items-center gap-1 text-xs text-gray-500 bg-white px-2.5 py-1 rounded-lg border border-gray-100">⏱ {r.cook_time}</span>}
          <span className="text-xs text-gray-500 bg-white px-2.5 py-1 rounded-lg border border-gray-100">{cur} {t(lang, 'serv')}</span>
          {r.calories && <span className="text-xs text-gray-500 bg-white px-2.5 py-1 rounded-lg border border-gray-100">🔥 {r.calories} {t(lang, 'kcal')}</span>}
          <button className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto" onClick={() => onOpenProfile(r.user_id)}>
            {r.author_avatar ? <img src={r.author_avatar} alt="" className="w-5 h-5 rounded-full object-cover" /> : null}
            <span className="font-semibold">{r.author_name || r.author_username}</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-500 shadow-sm" onClick={onLike}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={liked?'#e74c3c':'none'} stroke={liked?'#e74c3c':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {r.likes_count || 0}
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-500 shadow-sm" onClick={onFav}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={faved?'#f59e0b':'none'} stroke={faved?'#f59e0b':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            {faved ? t(lang, 'inFav') : t(lang, 'toFav')}
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-500 shadow-sm" onClick={doShare}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            {t(lang, 'share')}
          </button>
          {onExport && (
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-500 shadow-sm" onClick={() => onExport(r, photos)}>
              📄 {t(lang, 'exportPdf')}
            </button>
          )}
          {!isAuthor && onMessage && (
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-500 shadow-sm" onClick={() => onMessage(r.user_id, r.author_name || r.author_username)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              {t(lang, 'writeMsg')}
            </button>
          )}
        </div>

        {/* Servings control */}
        <div className="flex items-center gap-3 mb-5 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-sm font-semibold flex-1">{t(lang, 'servings')}</span>
          <button className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center font-bold text-lg" onClick={() => setMult(m => Math.max(0.5, m - 0.5))}>−</button>
          <span className="text-lg font-extrabold min-w-[24px] text-center">{cur}</span>
          <button className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center font-bold text-lg" onClick={() => setMult(m => m + 0.5)}>+</button>
        </div>

        {/* Ingredients */}
        <h3 className="font-display text-lg font-bold mb-3">{t(lang, 'ingredients')}</h3>
        <div className="mb-6 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {(r.ingredients || []).map((ing, i) => {
            const amt = ing.amount ? Math.round(ing.amount * mult * 100) / 100 : '';
            return (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 text-sm ${i > 0 ? 'border-t border-dashed border-gray-100' : ''}`}>
                <span className="font-bold min-w-[60px] text-brand text-xs">{amt} {ing.unit || ''}</span>
                <span className="flex-1">{ing.name}</span>
              </div>
            );
          })}
        </div>

        {/* Steps */}
        <h3 className="font-display text-lg font-bold mb-3">{t(lang, 'steps')}</h3>
        <div className="flex flex-col gap-4 mb-6">
          {(r.steps || []).map((step, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center font-extrabold text-sm flex-shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  {step.title && <div className="font-bold text-sm mb-1">{step.title}</div>}
                  <div className="flex gap-3 items-start">
                    <div className="flex-1 text-sm text-gray-600 leading-relaxed">{step.content}</div>
                    {step.photo_url && (
                      <img
                        src={step.photo_url}
                        alt=""
                        className="w-[30%] aspect-video object-cover rounded-xl cursor-pointer flex-shrink-0"
                        onClick={() => setLightboxSrc(step.photo_url)}
                      />
                    )}
                  </div>
                  {step.timer_seconds && (
                    <span className="inline-flex items-center gap-1 text-xs text-brand font-semibold mt-2 px-2.5 py-1 bg-brand-light rounded-lg">
                      ⏱ {fmtTimer(step.timer_seconds)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tips */}
        {r.tips && (
          <>
            <h3 className="font-display text-lg font-bold mb-3">{t(lang, 'tips')}</h3>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800 leading-relaxed mb-6">{r.tips}</div>
          </>
        )}

        {/* Date */}
        <p className="text-xs text-gray-300 text-center mb-6">
          {new Date(r.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* Comments */}
        <h3 className="font-display text-lg font-bold mb-3">{t(lang, 'comments')} ({comments.filter(c => !c.is_deleted).length})</h3>

        {replyTo && (
          <div className="flex items-center gap-2 mb-2 px-1 text-xs text-gray-500">
            <span>Отвечаю @{replyTo.username}</span>
            <button className="text-gray-400 ml-1" onClick={() => { setReplyTo(null); setNewComment(''); }}>✕</button>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <input
            ref={commentRef}
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-2xl text-sm outline-none focus:border-brand bg-white transition-colors"
            placeholder={t(lang, 'addComment')}
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addComment()}
          />
          <button
            className="px-4 py-2.5 gradient-btn text-white rounded-2xl text-sm font-bold disabled:opacity-50 shadow-sm"
            disabled={!newComment.trim()}
            onClick={addComment}
          >{t(lang, 'send')}</button>
        </div>

        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">{t(lang, 'noComments')}</p>
        ) : (() => {
          const topLevel = comments.filter(c => !c.parent_id);
          const repliesMap = {};
          comments.filter(c => c.parent_id).forEach(c => {
            if (!repliesMap[c.parent_id]) repliesMap[c.parent_id] = [];
            repliesMap[c.parent_id].push(c);
          });

          function CommentRow({ c, isReply }) {
            return (
              <div className={`bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm ${isReply ? 'ml-6 border-l-2 border-l-gray-200' : ''}`}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {c.profiles?.avatar_url ? (
                    <img src={c.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                      {(c.profiles?.display_name || c.profiles?.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-bold">{c.profiles?.display_name || c.profiles?.username}</span>
                  {c.user_id === r.user_id && !c.is_deleted && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-brand-light text-brand">{t(lang, 'authorBadge')}</span>
                  )}
                  <span className="text-xs text-gray-400">{timeAgo(c.created_at, lang)}</span>
                  {!c.is_deleted && (
                    <div className="ml-auto flex items-center gap-3">
                      <button className="text-xs text-gray-400 font-semibold" onClick={() => handleReply(c)}>{t(lang, 'replyBtn')}</button>
                      {canDelete(c) && (
                        <button className="text-xs text-red-400 font-semibold" onClick={() => deleteComment(c)}>{t(lang, 'deleteComment')}</button>
                      )}
                    </div>
                  )}
                </div>
                {c.is_deleted ? (
                  <p className="text-sm italic text-gray-400">
                    {c.deleted_by_role ? 'Удалено модератором' : 'Комментарий удалён'}
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 leading-relaxed">{c.text}</p>
                )}
              </div>
            );
          }

          return (
            <div className="flex flex-col gap-3">
              {topLevel.map(c => (
                <div key={c.id} className="flex flex-col gap-2">
                  <CommentRow c={c} isReply={false} />
                  {(repliesMap[c.id] || []).map(reply => (
                    <CommentRow key={reply.id} c={reply} isReply={true} />
                  ))}
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
