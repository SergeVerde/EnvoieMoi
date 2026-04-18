'use client';

import { t, LANGS } from '@/lib/i18n';

const MSG_PRIVACY_OPTIONS = [
  { key: 'everyone', labelKey: 'msgEveryone' },
  { key: 'followingAndFollowers', labelKey: 'msgFollowingAndFollowers' },
  { key: 'following', labelKey: 'msgFollowing' },
  { key: 'nobody', labelKey: 'msgNobody' },
];

export default function SettingsView({ supabase, user, settings, lang, onBack, onUpdate }) {
  async function update(key, value) {
    const newSettings = { ...settings, [key]: value };
    await supabase.from('user_settings').update({ [key]: value }).eq('user_id', user.id);
    onUpdate(newSettings);
  }

  return (
    <div className="max-w-md mx-auto min-h-screen pb-6">
      <div className="sticky top-0 bg-[#f8f7f4] z-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
        <button className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center shadow-sm" onClick={onBack}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="font-display text-xl font-extrabold gradient-text">{t(lang, 'settings')}</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 pt-6 space-y-6">
        <div>
          <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">{t(lang, 'uiLang')}</h3>
          <div className="flex flex-wrap gap-2">
            {LANGS.map(lg => (
              <button
                key={lg.code}
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors ${settings.ui_lang === lg.code ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}
                onClick={() => update('ui_lang', lg.code)}
              >{lg.flag} {lg.label}</button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">{t(lang, 'rcpLang')}</h3>
          <div className="flex flex-wrap gap-2">
            {LANGS.map(lg => (
              <button
                key={lg.code}
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors ${settings.recipe_lang === lg.code ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}
                onClick={() => update('recipe_lang', lg.code)}
              >{lg.flag} {lg.label}</button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">{t(lang, 'msgPrivacy')}</h3>
          <div className="flex flex-col gap-2">
            {MSG_PRIVACY_OPTIONS.map(opt => (
              <button
                key={opt.key}
                className={`w-full py-3 px-4 rounded-xl border text-sm font-semibold text-left transition-colors ${(settings.message_privacy || 'everyone') === opt.key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}
                onClick={() => update('message_privacy', opt.key)}
              >{t(lang, opt.labelKey)}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
