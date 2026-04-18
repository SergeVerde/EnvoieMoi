'use client';

import { useState } from 'react';
import { t, LANGS } from '@/lib/i18n';

const MSG_PRIVACY_OPTIONS = [
  { key: 'everyone', labelKey: 'msgEveryone' },
  { key: 'followingAndFollowers', labelKey: 'msgFollowingAndFollowers' },
  { key: 'following', labelKey: 'msgFollowing' },
  { key: 'nobody', labelKey: 'msgNobody' },
];

const FEED_MODE_OPTIONS = [
  { key: 'chronological', labelKey: 'feedChronological' },
  { key: 'smart', labelKey: 'feedSmart' },
];

export default function SettingsView({ supabase, user, settings, lang, onBack, onUpdate, onLogout }) {
  const [picker, setPicker] = useState(null);

  async function update(key, value) {
    const newSettings = { ...settings, [key]: value };
    await supabase.from('user_settings').update({ [key]: value }).eq('user_id', user.id);
    onUpdate(newSettings);
    setPicker(null);
  }

  const uiLangLabel = LANGS.find(l => l.code === settings.ui_lang);
  const recipeLangLabel = LANGS.find(l => l.code === settings.recipe_lang);
  const privacyLabel = MSG_PRIVACY_OPTIONS.find(o => o.key === (settings.message_privacy || 'everyone'));
  const feedModeLabel = FEED_MODE_OPTIONS.find(o => o.key === (settings.feed_mode || 'chronological'));

  function pickerTitle() {
    if (picker === 'uiLang') return t(lang, 'uiLang');
    if (picker === 'recipeLang') return t(lang, 'rcpLang');
    if (picker === 'msgPrivacy') return t(lang, 'msgPrivacy');
    if (picker === 'feedMode') return t(lang, 'feedMode');
    return '';
  }

  function pickerOptions() {
    if (picker === 'msgPrivacy') {
      const cur = settings.message_privacy || 'everyone';
      return MSG_PRIVACY_OPTIONS.map(opt => (
        <button
          key={opt.key}
          className={`w-full py-3 px-4 rounded-xl border text-sm font-semibold text-left flex items-center justify-between ${cur === opt.key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}
          onClick={() => update('message_privacy', opt.key)}
        >
          {t(lang, opt.labelKey)}
          {cur === opt.key && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
        </button>
      ));
    }
    if (picker === 'feedMode') {
      const cur = settings.feed_mode || 'chronological';
      return FEED_MODE_OPTIONS.map(opt => (
        <button
          key={opt.key}
          className={`w-full py-3 px-4 rounded-xl border text-sm font-semibold text-left flex items-center justify-between ${cur === opt.key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}
          onClick={() => update('feed_mode', opt.key)}
        >
          {t(lang, opt.labelKey)}
          {cur === opt.key && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
        </button>
      ));
    }
    const key = picker === 'uiLang' ? 'ui_lang' : 'recipe_lang';
    const current = settings[key];
    return LANGS.map(lg => (
      <button
        key={lg.code}
        className={`w-full py-3 px-4 rounded-xl border text-sm font-semibold text-left flex items-center justify-between ${current === lg.code ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}
        onClick={() => update(key, lg.code)}
      >
        <span>{lg.flag} {lg.label}</span>
        {current === lg.code && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
      </button>
    ));
  }

  function SettingRow({ label, value, onPress }) {
    return (
      <button className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm" onClick={onPress}>
        <span className="text-sm font-semibold">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">{value}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </button>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen pb-6">
      {picker && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={() => setPicker(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-t-3xl w-full max-w-md p-5 pb-8" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
            <h3 className="font-display text-lg font-bold mb-4">{pickerTitle()}</h3>
            <div className="flex flex-col gap-2">{pickerOptions()}</div>
          </div>
        </div>
      )}

      <div className="sticky top-0 bg-white z-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
        <button className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center shadow-sm" onClick={onBack}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="font-display text-xl font-extrabold gradient-text">{t(lang, 'settings')}</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 pt-4 space-y-2">
        <SettingRow label={t(lang, 'uiLang')} value={`${uiLangLabel?.flag} ${uiLangLabel?.label}`} onPress={() => setPicker('uiLang')} />
        <SettingRow label={t(lang, 'rcpLang')} value={`${recipeLangLabel?.flag} ${recipeLangLabel?.label}`} onPress={() => setPicker('recipeLang')} />
        <SettingRow label={t(lang, 'msgPrivacy')} value={t(lang, privacyLabel?.labelKey)} onPress={() => setPicker('msgPrivacy')} />
        <SettingRow label={t(lang, 'feedMode')} value={t(lang, feedModeLabel?.labelKey)} onPress={() => setPicker('feedMode')} />

        <div className="pt-4">
          <button className="w-full py-3.5 rounded-2xl border border-red-100 bg-red-50 text-red-500 text-sm font-bold" onClick={onLogout}>
            {t(lang, 'logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
