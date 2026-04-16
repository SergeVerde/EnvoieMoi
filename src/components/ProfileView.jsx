'use client';

import { useState, useEffect, useRef } from 'react';
import { t, timeAgo } from '@/lib/i18n';
import { resizeImage } from '@/lib/image';

export default function ProfileView({ supabase, userId, currentUser, profile: myProfile, lang, onBack, onOpenRecipe, onSettings, onLogout, setProfile }) {
  const [prof, setProf] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editWeb, setEditWeb] = useState('');
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(true);
  const avatarRef = useRef(null);

  const isMe = userId === currentUser?.id;

  useEffect(() => { load(); }, [userId]);

  async function load() {
    setLoading(true);
    const [profRes, recipesRes, followersRes, followingRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('recipes_feed').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('follows').select('follower_id', { count: 'exact' }).eq('following_id', userId),
      supabase.from('follows').select('following_id', { count: 'exact' }).eq('follower_id', userId),
    ]);

    setProf(profRes.data);
    setRecipes(recipesRes.data || []);
    setFollowersCount(followersRes.count || 0);
    setFollowingCount(followingRes.count || 0);

    if (!isMe && currentUser) {
      const { data } = await supabase.from('follows').select('follower_id').eq('follower_id', currentUser.id).eq('following_id', userId).maybeSingle();
      setIsFollowing(!!data);
    }
    setLoading(false);
  }

  async function toggleFollow() {
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', userId);
      setIsFollowing(false);
      setFollowersCount(c => c - 1);
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: userId });
      setIsFollowing(true);
      setFollowersCount(c => c + 1);
    }
  }

  function startEdit() {
    setEditBio(prof?.bio || '');
    setEditWeb(prof?.website || '');
    setEditName(prof?.display_name || '');
    setEditing(true);
  }

  async function saveEdit() {
    const updates = { display_name: editName, bio: editBio, website: editWeb };
    await supabase.from('profiles').update(updates).eq('id', userId);
    setProf({ ...prof, ...updates });
    if (isMe && setProfile) setProfile({ ...myProfile, ...updates });
    setEditing(false);
  }

  async function uploadAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const blob = await resizeImage(file, 400, 0.85);
    const path = `${userId}/avatar_${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
      setProf({ ...prof, avatar_url: publicUrl });
      if (isMe && setProfile) setProfile({ ...myProfile, avatar_url: publicUrl });
    }
    e.target.value = '';
  }

  if (loading) return (
    <div className="max-w-md mx-auto min-h-screen flex items-center justify-center">
      <div className="w-9 h-9 border-3 border-gray-200 border-t-brand rounded-full animate-spin" />
    </div>
  );

if (!prof) {
    // Profile doesn't exist yet, create it
    const createProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const username = user.email?.split('@')[0] || 'user_' + user.id.slice(0, 6);
        await supabase.from('profiles').upsert({
          id: user.id,
          username: username,
          display_name: user.user_metadata?.full_name || user.user_metadata?.name || username,
          avatar_url: user.user_metadata?.avatar_url || '',
          role: 'creator',
        }, { onConflict: 'id' });
        load();
      }
    };
    createProfile();
    return (
      <div className="max-w-md mx-auto min-h-screen flex items-center justify-center">
        <div className="w-9 h-9 border-3 border-gray-200 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <div className="max-w-md mx-auto min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-[#faf8f5] z-50 border-b border-gray-200 px-5 py-4 flex items-center justify-between">
        <button className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center" onClick={onBack}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="font-display text-xl font-extrabold gradient-text">{t(lang, 'profile')}</h1>
        {isMe ? (
          <button className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center" onClick={onSettings}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        ) : <div className="w-10" />}
      </div>

      <div className="px-5 pt-6">
        {/* Avatar */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            {prof.avatar_url ? (
              <img src={prof.avatar_url} alt="" className="w-20 h-20 rounded-2xl object-cover mx-auto" />
            ) : (
              <div className="w-20 h-20 rounded-2xl gradient-btn flex items-center justify-center text-3xl text-white font-extrabold font-display mx-auto">
                {(prof.display_name || prof.username || '?')[0].toUpperCase()}
              </div>
            )}
            {isMe && (
              <>
                <input type="file" accept="image/*" ref={avatarRef} className="hidden" onChange={uploadAvatar} />
                <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center text-sm shadow-md" onClick={() => avatarRef.current?.click()}>📷</button>
              </>
            )}
          </div>

          {editing ? (
            <input className="mt-3 text-center font-display text-xl font-bold outline-none border-b-2 border-brand bg-transparent w-48" value={editName} onChange={e => setEditName(e.target.value)} />
          ) : (
            <h2 className="font-display text-xl font-bold mt-3">{prof.display_name || prof.username}</h2>
          )}
          <p className="text-xs text-gray-400">@{prof.username}</p>

          {/* Stats */}
          <div className="flex justify-center gap-6 mt-3">
            <div className="text-center"><div className="text-lg font-extrabold">{recipes.length}</div><div className="text-[11px] text-gray-400">{t(lang, 'rcpC')}</div></div>
            <div className="text-center"><div className="text-lg font-extrabold">{followersCount}</div><div className="text-[11px] text-gray-400">{t(lang, 'followers')}</div></div>
            <div className="text-center"><div className="text-lg font-extrabold">{followingCount}</div><div className="text-[11px] text-gray-400">{t(lang, 'following')}</div></div>
          </div>

          {/* Bio */}
          {editing ? (
            <div className="mt-4 space-y-2 text-left">
              <label className="text-xs font-bold text-gray-500">{t(lang, 'bio')}</label>
              <textarea className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white resize-none h-20" value={editBio} onChange={e => setEditBio(e.target.value)} placeholder={t(lang, 'bioP')} />
              <label className="text-xs font-bold text-gray-500">{t(lang, 'website')}</label>
              <input className="w-full px-2.5 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white" value={editWeb} onChange={e => setEditWeb(e.target.value)} placeholder={t(lang, 'websiteP')} />
              <div className="flex gap-2">
                <button className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-gray-200" onClick={() => setEditing(false)}>{t(lang, 'back')}</button>
                <button className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-green-700 text-white" onClick={saveEdit}>{t(lang, 'save')}</button>
              </div>
            </div>
          ) : (
            <>
              {prof.bio && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{prof.bio}</p>}
              {prof.website && <a href={prof.website.startsWith('http') ? prof.website : 'https://' + prof.website} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-xs text-brand font-semibold">🔗 {prof.website}</a>}
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-center mt-4">
            {isMe && !editing && (
              <>
                <button className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white" onClick={startEdit}>{t(lang, 'editProfile')}</button>
                <button className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-red-400" onClick={onLogout}>{t(lang, 'logout')}</button>
              </>
            )}
            {!isMe && (
              <button
                className={`px-6 py-2.5 rounded-xl text-sm font-bold ${isFollowing ? 'bg-white border border-gray-200 text-gray-600' : 'gradient-btn text-white'}`}
                onClick={toggleFollow}
              >
                {isFollowing ? t(lang, 'unfollow') : t(lang, 'follow')}
              </button>
            )}
          </div>
        </div>

        {/* Recipes */}
        <h3 className="font-display text-lg font-bold mb-3">{isMe ? t(lang, 'myRec') : t(lang, 'rcpC')}</h3>
        {recipes.length === 0 ? (
          <div className="text-center py-8"><div className="text-4xl mb-2">📝</div><p className="text-sm text-gray-400">{t(lang, 'noRec')}</p></div>
        ) : (
          <div className="flex flex-col gap-3">
            {recipes.map(r => (
              <div key={r.id} className="bg-white rounded-2xl overflow-hidden border border-gray-200 cursor-pointer" onClick={() => onOpenRecipe(r.id)}>
                {r.main_photo_url ? (
                  <div className="h-24 bg-cover bg-center" style={{ backgroundImage: `url(${r.main_photo_url})` }} />
                ) : (
                  <div className="h-24 flex items-center justify-center text-4xl" style={{ background: '#fef3e2' }}>🍽️</div>
                )}
                <div className="p-3">
                  <div className="font-display text-base font-bold">{r.title}</div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span>❤️ {r.likes_count || 0}</span>
                    <span>💬 {r.comments_count || 0}</span>
                    <span>{timeAgo(r.created_at, lang)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
