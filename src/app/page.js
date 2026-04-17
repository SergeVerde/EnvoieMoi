'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { t, DISH_TYPES, MEAL_TIMES, DIETARY_TAGS, CUISINES } from '@/lib/i18n';
import RecipeCard from '@/components/RecipeCard';
import BottomNav from '@/components/BottomNav';
import AuthScreen from '@/components/AuthScreen';
import AddRecipe from '@/components/AddRecipe';
import RecipeDetail from '@/components/RecipeDetail';
import RecipeExportView from '@/components/RecipeExportView';
import ProfileView from '@/components/ProfileView';
import SettingsView from '@/components/SettingsView';
import OnboardingView from '@/components/OnboardingView';
import MessagesScreen from '@/components/MessagesScreen';
import ChatScreen from '@/components/ChatScreen';

export default function Home() {
  const supabase = createClient();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('feed');
  const [recipes, setRecipes] = useState([]);
  const [favIds, setFavIds] = useState([]);
  const [likeIds, setLikeIds] = useState([]);
  const [filter, setFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [viewUserId, setViewUserId] = useState(null);
  const [toast, setToast] = useState('');
  const [settings, setSettings] = useState({ ui_lang: 'ru', recipe_lang: 'ru', message_privacy: 'everyone' });
  const [editRecipeData, setEditRecipeData] = useState(null);
  const [exportRecipeData, setExportRecipeData] = useState(null);
  const [exportPhotos, setExportPhotos] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDishType, setFilterDishType] = useState(null);
  const [filterMealTime, setFilterMealTime] = useState(null);
  const [filterDietary, setFilterDietary] = useState([]);
  const [filterCuisine, setFilterCuisine] = useState(null);
  const [profileResults, setProfileResults] = useState([]);
  const [guestModal, setGuestModal] = useState(false);
  const [chatConvId, setChatConvId] = useState(null);
  const [chatOtherUserId, setChatOtherUserId] = useState(null);
  const [chatOtherName, setChatOtherName] = useState('');
  const [chatOtherAvatar, setChatOtherAvatar] = useState('');

  const L = settings.ui_lang;
  const canAdd = ['cook', 'admin', 'creator', 'premium'].includes(profile?.role);
  const isProfileSearch = search.startsWith('@');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) loadUserData(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadUserData(session.user.id);
        setScreen('feed');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isProfileSearch || search.length < 2) { setProfileResults([]); return; }
    const q = search.slice(1).toLowerCase();
    supabase.from('profiles').select('id, username, display_name, avatar_url')
      .ilike('username', `%${q}%`).limit(10)
      .then(({ data }) => setProfileResults(data || []));
  }, [search]);

  async function loadUserData(userId) {
    const [profileRes, settingsRes, favsRes, likesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_settings').select('*').eq('user_id', userId).single(),
      supabase.from('favorites').select('recipe_id').eq('user_id', userId),
      supabase.from('likes').select('recipe_id').eq('user_id', userId),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (!profileRes.data) {
      const { data: { user } } = await supabase.auth.getUser();
      const username = user?.email?.split('@')[0] || 'user_' + userId.slice(0, 6);
      await supabase.from('profiles').upsert({
        id: userId,
        username: username,
        display_name: user?.user_metadata?.full_name || username,
        avatar_url: user?.user_metadata?.avatar_url || '',
        role: 'guest',
      }, { onConflict: 'id' });
      const { data: newProfile } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (newProfile) setProfile(newProfile);
    }
    if (settingsRes.data) setSettings(settingsRes.data);
    setFavIds((favsRes.data || []).map(f => f.recipe_id));
    setLikeIds((likesRes.data || []).map(l => l.recipe_id));

    await loadRecipes();
    setLoading(false);
  }

  async function loadRecipes() {
    const { data } = await supabase
      .from('recipes_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setRecipes(data || []);
  }

  async function toggleLike(recipeId) {
    const liked = likeIds.includes(recipeId);
    if (liked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('recipe_id', recipeId);
      setLikeIds(likeIds.filter(id => id !== recipeId));
    } else {
      await supabase.from('likes').insert({ user_id: user.id, recipe_id: recipeId });
      setLikeIds([...likeIds, recipeId]);
    }
    loadRecipes();
  }

  async function toggleFav(recipeId) {
    const faved = favIds.includes(recipeId);
    if (faved) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('recipe_id', recipeId);
      setFavIds(favIds.filter(id => id !== recipeId));
      showToast(t(L, 'rmFav'));
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, recipe_id: recipeId });
      setFavIds([...favIds, recipeId]);
      showToast(t(L, 'addFav'));
    }
  }

  function openRecipe(id) { setSelectedId(id); setScreen('detail'); }
  function openProfile(userId) { setViewUserId(userId || user?.id); setScreen('profile'); }
  function openChat(convId, otherUserId, otherName, otherAvatar) {
    setChatConvId(convId || null);
    setChatOtherUserId(otherUserId);
    setChatOtherName(otherName || '');
    setChatOtherAvatar(otherAvatar || '');
    setScreen('chat');
  }
  function handleMessage(toUserId, toName) {
    openChat(null, toUserId, toName, '');
  }

  function handleAddClick() {
    if (canAdd) setScreen('add');
    else setGuestModal(true);
  }

  const hasFilters = filterDishType || filterMealTime || filterDietary.length > 0 || filterCuisine;
  const allTags = [...new Set(recipes.flatMap(r => r.tags || []))];

  const filtered = recipes.filter(r => {
    if (screen === 'favorites' && !favIds.includes(r.id)) return false;
    if (filter && !(r.tags || []).includes(filter)) return false;
    if (filterDishType) {
      const dt = r.dish_type;
      if (!dt || (Array.isArray(dt) ? !dt.includes(filterDishType) : dt !== filterDishType)) return false;
    }
    if (filterMealTime) {
      const mt = r.meal_time;
      if (!mt || (Array.isArray(mt) ? !mt.includes(filterMealTime) : mt !== filterMealTime)) return false;
    }
    if (filterDietary.length > 0) {
      const rd = r.dietary || [];
      if (!filterDietary.every(d => rd.includes(d))) return false;
    }
    if (filterCuisine && r.cuisine !== filterCuisine) return false;
    if (search && !isProfileSearch) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) return (
    <div className="max-w-md mx-auto min-h-screen flex items-center justify-center">
      <div className="w-9 h-9 border-3 border-gray-200 border-t-green-600 rounded-full animate-spin" />
    </div>
  );

  if (!user) return <AuthScreen supabase={supabase} />;

  // Onboarding gate
  if (profile && profile.age === null && screen !== 'settings' && screen !== 'profile') {
    return (
      <OnboardingView
        supabase={supabase}
        user={user}
        profile={profile}
        lang={L}
        onComplete={(updatedProfile) => { setProfile(updatedProfile); setScreen('feed'); }}
        onSkip={() => setScreen('feed')}
      />
    );
  }

  if (screen === 'detail' && selectedId) return (
    <RecipeDetail
      recipeId={selectedId}
      supabase={supabase}
      user={user}
      userProfile={profile}
      lang={L}
      liked={likeIds.includes(selectedId)}
      faved={favIds.includes(selectedId)}
      onLike={() => toggleLike(selectedId)}
      onFav={() => toggleFav(selectedId)}
      onBack={() => { setScreen('feed'); setSelectedId(null); }}
      onOpenProfile={openProfile}
      onEdit={(recipeData) => { setEditRecipeData(recipeData); setScreen('edit'); }}
      onExport={(recipeData, recipePhotos) => { setExportRecipeData(recipeData); setExportPhotos(recipePhotos); setScreen('export'); }}
      onMessage={handleMessage}
      showToast={showToast}
    />
  );

  if (screen === 'export' && exportRecipeData) return (
    <RecipeExportView
      recipe={exportRecipeData}
      photos={exportPhotos}
      lang={L}
      onBack={() => { setScreen('detail'); setExportRecipeData(null); setExportPhotos([]); }}
    />
  );

  if (screen === 'edit' && editRecipeData) return (
    <AddRecipe
      supabase={supabase}
      user={user}
      profile={profile}
      lang={L}
      recipeLang={settings.recipe_lang}
      canAdd={canAdd}
      editRecipe={editRecipeData}
      onPublished={() => { loadRecipes(); setScreen('detail'); setEditRecipeData(null); showToast(t(L, 'updatedMsg')); }}
      onBack={() => { setScreen('detail'); setEditRecipeData(null); }}
    />
  );

  if (screen === 'add') return (
    <AddRecipe
      supabase={supabase}
      user={user}
      profile={profile}
      lang={L}
      recipeLang={settings.recipe_lang}
      canAdd={canAdd}
      onPublished={() => { loadRecipes(); setScreen('feed'); showToast(t(L, 'published')); }}
      onBack={() => setScreen('feed')}
    />
  );

  if (screen === 'profile') return (
    <ProfileView
      supabase={supabase}
      userId={viewUserId || user.id}
      currentUser={user}
      profile={profile}
      lang={L}
      onBack={() => { setScreen('feed'); setViewUserId(null); }}
      onOpenRecipe={openRecipe}
      onSettings={() => setScreen('settings')}
      onLogout={async () => { await supabase.auth.signOut(); setUser(null); setProfile(null); }}
      setProfile={setProfile}
      onMessage={handleMessage}
    />
  );

  if (screen === 'settings') return (
    <SettingsView
      supabase={supabase}
      user={user}
      settings={settings}
      lang={L}
      onBack={() => setScreen('profile')}
      onUpdate={(s) => setSettings(s)}
    />
  );

  if (screen === 'messages') return (
    <MessagesScreen
      supabase={supabase}
      user={user}
      lang={L}
      onOpenChat={openChat}
      onBack={() => setScreen('feed')}
    />
  );

  if (screen === 'chat') return (
    <ChatScreen
      supabase={supabase}
      user={user}
      conversationId={chatConvId}
      otherUserId={chatOtherUserId}
      otherName={chatOtherName}
      otherAvatar={chatOtherAvatar}
      lang={L}
      onBack={() => setScreen('messages')}
    />
  );

  // Feed / Favorites
  return (
    <div className="max-w-md mx-auto min-h-screen relative pb-24">
      {/* Guest modal */}
      {guestModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center" onClick={() => setGuestModal(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-8" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl gradient-btn flex items-center justify-center mx-auto mb-4 shadow-md">
              <span className="text-xl">🌿</span>
            </div>
            <h3 className="font-display text-xl font-extrabold text-center mb-2">{t(L, 'premiumModal')}</h3>
            <p className="text-sm text-gray-500 text-center leading-relaxed mb-5">{t(L, 'premiumModalSub')}</p>
            <button className="w-full py-3 rounded-2xl text-sm font-bold bg-gray-100 text-gray-600" onClick={() => setGuestModal(false)}>{t(L, 'back')}</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 bg-[#f8f7f4]/95 backdrop-blur z-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-btn flex items-center justify-center shadow-sm">
            <span className="text-sm">🌿</span>
          </div>
          <h1 className="font-display text-xl font-extrabold gradient-text">Pestogram</h1>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 pt-3 pb-2">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              className="flex-1 outline-none text-sm bg-transparent"
              placeholder={isProfileSearch ? t(L, 'searchProfiles') : t(L, 'search')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="text-gray-300 text-lg leading-none" onClick={() => setSearch('')}>✕</button>}
          </div>
          <button
            className={`w-10 h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 shadow-sm ${hasFilters || filterOpen ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-500'}`}
            onClick={() => setFilterOpen(o => !o)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className="px-5 pb-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="mb-3">
              <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">{t(L, 'dishType')}</div>
              <div className="flex flex-wrap gap-1.5">
                {DISH_TYPES.map(dt => (
                  <button
                    key={dt}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${filterDishType === dt ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                    onClick={() => setFilterDishType(filterDishType === dt ? null : dt)}
                  >{dt}</button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">{t(L, 'mealTime')}</div>
              <div className="flex flex-wrap gap-1.5">
                {MEAL_TIMES.map(mt => (
                  <button
                    key={mt}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${filterMealTime === mt ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                    onClick={() => setFilterMealTime(filterMealTime === mt ? null : mt)}
                  >{mt}</button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">{t(L, 'dietary')}</div>
              <div className="flex flex-wrap gap-1.5">
                {DIETARY_TAGS.map(d => (
                  <button
                    key={d}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${filterDietary.includes(d) ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                    onClick={() => setFilterDietary(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                  >{d}</button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">{t(L, 'cuisine')}</div>
              <div className="flex flex-wrap gap-1.5">
                {CUISINES.map(c => (
                  <button
                    key={c}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${filterCuisine === c ? 'bg-blue-700 text-white border-blue-700' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                    onClick={() => setFilterCuisine(filterCuisine === c ? null : c)}
                  >{c}</button>
                ))}
              </div>
            </div>
            {hasFilters && (
              <button className="mt-1 text-xs text-red-400 font-semibold" onClick={() => { setFilterDishType(null); setFilterMealTime(null); setFilterDietary([]); setFilterCuisine(null); }}>{t(L, 'clearFilters')}</button>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {!isProfileSearch && allTags.length > 0 && (
        <div className="flex gap-2 px-5 pb-3 overflow-x-auto hide-scrollbar">
          <button
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${!filter ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'}`}
            onClick={() => setFilter(null)}
          >{t(L, 'all')}</button>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${filter === tag ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'}`}
              onClick={() => setFilter(tag)}
            >{tag}</button>
          ))}
        </div>
      )}

      {/* Profile search results */}
      {isProfileSearch ? (
        profileResults.length === 0 ? (
          <div className="text-center py-8 px-5">
            <p className="text-sm text-gray-400">{search.length > 1 ? t(L, 'noResults') : t(L, 'searchProfiles')}</p>
          </div>
        ) : (
          <div className="px-5 flex flex-col gap-2">
            <div className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">{t(L, 'profiles')}</div>
            {profileResults.map(u => (
              <button key={u.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 text-left w-full shadow-sm" onClick={() => { setSearch(''); openProfile(u.id); }}>
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center text-white font-extrabold font-display">
                    {(u.display_name || u.username || '?')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-bold text-sm">{u.display_name || u.username}</div>
                  <div className="text-xs text-gray-400">@{u.username}</div>
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        filtered.length === 0 ? (
          <div className="text-center py-16 px-5">
            <div className="text-5xl mb-3">{screen === 'favorites' ? '⭐' : '📝'}</div>
            <h3 className="font-display text-xl font-bold mb-2">{screen === 'favorites' ? t(L, 'emptyFav') : t(L, 'empty')}</h3>
            <p className="text-gray-400 text-sm">{screen === 'favorites' ? t(L, 'saveFav') : t(L, 'addFirst')}</p>
          </div>
        ) : (
          <div className="px-5 flex flex-col gap-4">
            {filtered.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                lang={L}
                liked={likeIds.includes(recipe.id)}
                faved={favIds.includes(recipe.id)}
                onOpen={() => openRecipe(recipe.id)}
                onLike={() => toggleLike(recipe.id)}
                onFav={() => toggleFav(recipe.id)}
                onShare={() => {
                  const txt = `🍽️ ${recipe.title}\n${recipe.description || ''}`;
                  if (navigator.share) navigator.share({ title: recipe.title, text: txt });
                  else { navigator.clipboard.writeText(txt); showToast(t(L, 'copied')); }
                }}
              />
            ))}
          </div>
        )
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold z-50 whitespace-nowrap shadow-lg">
          {toast}
        </div>
      )}

      {/* Nav */}
      <BottomNav
        screen={screen}
        lang={L}
        onFeed={() => { setScreen('feed'); setFilter(null); }}
        onFavs={() => { setScreen('favorites'); setFilter(null); }}
        onAdd={handleAddClick}
        onMessages={() => setScreen('messages')}
        onProfile={() => openProfile(user.id)}
      />
    </div>
  );
}
