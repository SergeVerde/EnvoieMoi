'use client';

import { useState, useEffect, useRef } from 'react';
import { t, timeAgo } from '@/lib/i18n';
import { resizeImage } from '@/lib/image';

function SwipeRow({ children, onSwipe, canSwipe }) {
  const [offsetX, setOffsetX] = useState(0);
  const startX = useRef(null);
  const THRESHOLD = 60;

  if (!canSwipe) return <>{children}</>;

  function onTouchStart(e) { startX.current = e.touches[0].clientX; }
  function onTouchMove(e) {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) setOffsetX(Math.max(dx, -THRESHOLD));
  }
  function onTouchEnd() {
    if (offsetX < -THRESHOLD / 2) setOffsetX(-THRESHOLD);
    else setOffsetX(0);
    startX.current = null;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div
        className="transition-transform duration-150"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
      <button
        className="absolute right-0 top-0 h-full px-4 bg-red-500 text-white text-xs font-bold rounded-r-2xl flex items-center"
        style={{ opacity: offsetX < -10 ? 1 : 0, transition: 'opacity 0.15s' }}
        onClick={onSwipe}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
      </button>
    </div>
  );
}

export default function ProfileView({ supabase, userId, currentUser, profile: myProfile, lang, onBack, onOpenRecipe, onOpenProfile, onSettings, onLogout, setProfile, onMessage }) {
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
  const [profileSection, setProfileSection] = useState(null);
  const [userList, setUserList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [avatarLightbox, setAvatarLightbox] = useState(false);
  const avatarRef = useRef(null);

  const isMe = userId === currentUser?.id;
  const canManage = !isMe && ['admin', 'creator'].includes(myProfile?.role);

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

  async function openFollowers() {
    setListLoading(true);
    setProfileSection('followers');
    const { data } = await supabase.from('follows').select('follower_id').eq('following_id', userId);
    const ids = (data || []).map(d => d.follower_id);
    if (!ids.length) { setUserList([]); setListLoading(false); return; }
    const { data: profs } = await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', ids);
    setUserList(profs || []);
    setListLoading(false);
  }

  async function openFollowing() {
    setListLoading(true);
    setProfileSection('following');
    const { data } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
    const ids = (data || []).map(d => d.following_id);
    if (!ids.length) { setUserList([]); setListLoading(false); return; }
    const { data: profs } = await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', ids);
    setUserList(profs || []);
    setListLoading(false);
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

  async function changeRole(newRole) {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    setProf({ ...prof, role: newRole });
    setRoleModal(false);
  }

  function doShareProfile() {
    const url = window.location.origin + '?u=' + (prof?.username || userId);
    if (navigator.share) navigator.share({ title: prof?.display_name || prof?.username, url });
    else navigator.clipboard.writeText(url);
    setMenuOpen(false);
  }

  if (loading) return (
    <div className="max-w-md mx-auto min-h-screen flex items-center justify-center">
      <div className="w-9 h-9 border-3 border-gray-200 border-t-brand rounded-full animate-spin" />
    </div>
  );

  if (!prof) {
    const createProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const username = user.email?.split('@')[0] || 'user_' + user.id.slice(0, 6);
        await supabase.from('profiles').upsert({
          id: user.id,
          username: username,
          display_name: user.user_metadata?.full_name || user.user_metadata?.name || username,
          avatar_url: user.user_metadata?.avatar_url || '',
          role: 'guest',
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

  // Followers / Following panel
  if (profileSection) {
    const isFollowers = profileSection === 'followers';
    const title = isFollowers ? t(lang, 'followersTitle') : t(lang, 'followingTitle');

    async function removeUser(u) {
      if (!confirm(isFollowers ? `Удалить ${u.display_name || u.username} из подписчиков?` : `Отписаться от ${u.display_name || u.username}?`)) return;
      if (isFollowers) {
        // Remove them from following current profile
        await supabase.from('follows').delete().eq('follower_id', u.id).eq('following_id', userId);
        setFollowersCount(c => c - 1);
      } else {
        // Unfollow them
        await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', u.id);
        setFollowingCount(c => c - 1);
      }
      setUserList(prev => prev.filter(x => x.id !== u.id));
    }

    return (
      <div className="max-w-md mx-auto min-h-screen pb-6">
        <div className="sticky top-0 bg-white z-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <button className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center shadow-sm" onClick={() => setProfileSection(null)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="font-display text-xl font-extrabold gradient-text">{title}</h1>
          <div className="w-10" />
        </div>
        <div className="px-5 pt-4">
          {listLoading ? (
            <div className="flex justify-center py-12"><div className="w-9 h-9 border-3 border-gray-200 border-t-brand rounded-full animate-spin" /></div>
          ) : userList.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-12">Пока никого нет</p>
          ) : (
            <div className="flex flex-col gap-2">
              {userList.map(u => (
                <SwipeRow
                  key={u.id}
                  onSwipe={() => removeUser(u)}
                  canSwipe={isFollowers ? isMe : (currentUser?.id === userId)}
                >
                  <button
                    className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 text-left shadow-sm w-full"
                    onClick={() => { setProfileSection(null); onOpenProfile ? onOpenProfile(u.id) : null; }}
                  >
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center text-white font-extrabold font-display">
                        {(u.display_name || u.username || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">{u.display_name || u.username}</div>
                      <div className="text-xs text-gray-400">@{u.username}</div>
                    </div>
                  </button>
                </SwipeRow>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const roleKeys = ['guest', 'cook', ...(myProfile?.role === 'creator' ? ['admin'] : [])];

  return (
    <div className="max-w-md mx-auto min-h-screen pb-24">
      {/* Avatar lightbox */}
      {avatarLightbox && prof.avatar_url && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center" onClick={() => setAvatarLightbox(false)}>
          <button className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white text-2xl">✕</button>
          <img src={prof.avatar_url} alt="" className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Role modal */}
      {roleModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center" onClick={() => setRoleModal(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold mb-4 text-center">{t(lang, 'changeRole')}</h3>
            <div className="flex flex-col gap-2">
              {roleKeys.map(role => (
                <button
                  key={role}
                  className={`w-full py-3 rounded-2xl text-sm font-bold border ${prof.role === role ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-700'}`}
                  onClick={() => changeRole(role)}
                >{t(lang, 'role' + role.charAt(0).toUpperCase() + role.slice(1))}</button>
              ))}
            </div>
            <button className="w-full mt-3 py-2 text-sm text-gray-400" onClick={() => setRoleModal(false)}>{t(lang, 'back')}</button>
          </div>
        </div>
      )}

      {/* Menu overlay */}
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}

      {/* Header */}
      <div className="sticky top-0 bg-[#f8f7f4] z-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
        <button className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center shadow-sm" onClick={onBack}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="font-display text-xl font-extrabold gradient-text">{t(lang, 'profile')}</h1>
        {isMe ? (
          <button className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center shadow-sm" onClick={onSettings}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        ) : canManage ? (
          <div className="relative z-50">
            <button className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-xl font-bold text-gray-500 leading-none shadow-sm" onClick={() => setMenuOpen(o => !o)}>⋮</button>
            {menuOpen && (
              <div className="absolute right-0 top-12 bg-white rounded-2xl border border-gray-100 shadow-xl min-w-[175px] py-2 z-50">
                <button className="w-full px-4 py-2.5 text-left text-sm font-semibold hover:bg-gray-50" onClick={doShareProfile}>{t(lang, 'shareProfile')}</button>
                <button className="w-full px-4 py-2.5 text-left text-sm font-semibold hover:bg-gray-50" onClick={() => { setMenuOpen(false); setRoleModal(true); }}>{t(lang, 'changeRole')}</button>
                <div className="h-px bg-gray-100 mx-3 my-1" />
                <button className="w-full px-4 py-2.5 text-left text-sm font-semibold text-orange-500 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>{t(lang, 'blockUser')}</button>
                <button className="w-full px-4 py-2.5 text-left text-sm font-semibold text-red-500 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>{t(lang, 'reportUser')}</button>
              </div>
            )}
          </div>
        ) : <div className="w-10" />}
      </div>

      <div className="px-5 pt-6">
        {/* Avatar */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            {prof.avatar_url ? (
              <img
                src={prof.avatar_url}
                alt=""
                className="w-24 h-24 rounded-3xl object-cover mx-auto cursor-pointer shadow-md"
                onClick={() => setAvatarLightbox(true)}
              />
            ) : (
              <div className="w-24 h-24 rounded-3xl gradient-btn flex items-center justify-center text-3xl text-white font-extrabold font-display mx-auto shadow-md">
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
          <div className="flex justify-center gap-8 mt-4">
            <div className="text-center">
              <div className="text-lg font-extrabold">{recipes.length}</div>
              <div className="text-[11px] text-gray-400">{t(lang, 'rcpC')}</div>
            </div>
            <button className="text-center" onClick={openFollowers}>
              <div className="text-lg font-extrabold">{followersCount}</div>
              <div className="text-[11px] text-gray-400">{t(lang, 'followers')}</div>
            </button>
            <button className="text-center" onClick={openFollowing}>
              <div className="text-lg font-extrabold">{followingCount}</div>
              <div className="text-[11px] text-gray-400">{t(lang, 'following')}</div>
            </button>
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
                <button className="flex-1 py-2.5 rounded-xl text-sm font-bold gradient-btn text-white" onClick={saveEdit}>{t(lang, 'save')}</button>
              </div>
            </div>
          ) : (
            <>
              {prof.bio && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{prof.bio}</p>}
              {prof.website && <a href={prof.website.startsWith('http') ? prof.website : 'https://' + prof.website} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-xs text-brand font-semibold">🔗 {prof.website}</a>}
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-center mt-4 flex-wrap">
            {isMe && !editing && (
              <>
                <button className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white shadow-sm" onClick={startEdit}>{t(lang, 'editProfile')}</button>
                <button className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-red-400 shadow-sm" onClick={onLogout}>{t(lang, 'logout')}</button>
              </>
            )}
            {!isMe && (
              <>
                <button
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm ${isFollowing ? 'bg-white border border-gray-200 text-gray-600' : 'gradient-btn text-white'}`}
                  onClick={toggleFollow}
                >
                  {isFollowing ? t(lang, 'unfollow') : t(lang, 'follow')}
                </button>
                {onMessage && (
                  <button
                    className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-600 shadow-sm flex items-center justify-center"
                    onClick={() => onMessage(userId, prof.display_name || prof.username)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Recipes */}
        <h3 className="font-display text-lg font-bold mb-3">{isMe ? t(lang, 'myRec') : t(lang, 'rcpC')}</h3>
        {recipes.length === 0 ? (
          <div className="text-center py-8"><div className="text-4xl mb-2">📝</div><p className="text-sm text-gray-400">{t(lang, 'noRec')}</p></div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recipes.map(r => (
              <div key={r.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 cursor-pointer shadow-sm active:scale-95 transition-transform" onClick={() => onOpenRecipe(r.id)}>
                {r.main_photo_url ? (
                  <div className="h-28 bg-cover bg-center" style={{ backgroundImage: `url(${r.main_photo_url})` }} />
                ) : (
                  <div className="h-28 flex items-center justify-center text-4xl" style={{ background: '#f0fdf4' }}>🍽️</div>
                )}
                <div className="p-2.5">
                  <div className="font-bold text-xs line-clamp-2 leading-snug">{r.title}</div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                    <span>❤️ {r.likes_count || 0}</span>
                    <span>💬 {r.comments_count || 0}</span>
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
