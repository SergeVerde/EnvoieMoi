'use client';

import { useState, useEffect } from 'react';
import { t } from '@/lib/i18n';

export default function OnboardingView({ supabase, user, profile, lang, onComplete, onSkip }) {
  const [username, setUsername] = useState(profile?.username || '');
  const [age, setAge] = useState('');
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'ok' | 'taken' | 'short'
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!username || username.length < 3) { setUsernameStatus(username.length > 0 ? 'short' : null); return; }
    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      const clean = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (clean !== username) { setUsername(clean); return; }
      const { data } = await supabase.from('profiles').select('id').eq('username', clean).neq('id', user.id).maybeSingle();
      setUsernameStatus(data ? 'taken' : 'ok');
    }, 600);
    return () => clearTimeout(timer);
  }, [username]);

  async function handleSubmit() {
    if (usernameStatus !== 'ok') return;
    const ageNum = parseInt(age);
    if (!ageNum || ageNum < 5 || ageNum > 120) { setError('Введи корректный возраст'); return; }
    setSaving(true);
    const updates = { username: username.toLowerCase(), age: ageNum };
    const { error: err } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (err) { setError('Ошибка сохранения. Попробуй снова.'); setSaving(false); return; }
    onComplete({ ...profile, ...updates });
  }

  const canSubmit = usernameStatus === 'ok' && parseInt(age) >= 5 && parseInt(age) <= 120 && !saving;

  return (
    <div className="max-w-md mx-auto min-h-screen flex items-center justify-center px-5 bg-[#faf8f5]">
      <div className="w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👋</div>
          <h1 className="font-display text-2xl font-extrabold gradient-text mb-2">{t(lang, 'onboardTitle')}</h1>
          <p className="text-gray-500 text-sm">{t(lang, 'onboardSub')}</p>
        </div>

        <div className="space-y-4 max-w-xs mx-auto">
          {/* Username */}
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">{t(lang, 'usernameLbl')}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">@</span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username"
                className="w-full pl-8 pr-10 py-3 border border-gray-200 rounded-2xl text-sm outline-none focus:border-amber-500 bg-white"
              />
              {usernameStatus === 'checking' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">...</span>
              )}
              {usernameStatus === 'ok' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600 font-bold">✓</span>
              )}
              {usernameStatus === 'taken' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-500 font-bold">✗</span>
              )}
            </div>
            <p className="text-[11px] mt-1 px-1">
              {usernameStatus === 'ok' && <span className="text-green-600 font-semibold">{t(lang, 'usernameOk')}</span>}
              {usernameStatus === 'taken' && <span className="text-red-500 font-semibold">{t(lang, 'usernameTaken')}</span>}
              {usernameStatus === 'short' && <span className="text-gray-400">{t(lang, 'usernameShort')}</span>}
              {!usernameStatus && <span className="text-gray-400">{t(lang, 'usernameHint')}</span>}
            </p>
          </div>

          {/* Age */}
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">{t(lang, 'ageLbl')}</label>
            <input
              type="number"
              min="5"
              max="120"
              value={age}
              onChange={e => setAge(e.target.value)}
              placeholder="18"
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm outline-none focus:border-amber-500 bg-white"
            />
          </div>

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full py-3.5 gradient-btn text-white rounded-2xl text-sm font-bold disabled:opacity-40 mt-2"
          >
            {saving ? '...' : t(lang, 'continueLbl')} 🚀
          </button>
          {onSkip && (
            <button onClick={onSkip} className="block mx-auto mt-3 text-xs text-gray-400">{t(lang, 'skip')}</button>
          )}
        </div>
      </div>
    </div>
  );
}
