'use client';

import { useState, useEffect } from 'react';
import { t, timeAgo } from '@/lib/i18n';

export default function MessagesScreen({ supabase, user, lang, onOpenChat, onBack }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('conversations')
      .select('*, user1:profiles!conversations_user1_id_fkey(id, username, display_name, avatar_url), user2:profiles!conversations_user2_id_fkey(id, username, display_name, avatar_url)')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (data) {
      const withLastMsg = await Promise.all(data.map(async conv => {
        const { data: msgs } = await supabase
          .from('messages')
          .select('text, created_at, sender_id')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1);
        return { ...conv, lastMessage: msgs?.[0] || null };
      }));
      setConversations(withLastMsg);
    }
    setLoading(false);
  }

  function getOtherUser(conv) {
    return conv.user1_id === user.id ? conv.user2 : conv.user1;
  }

  if (loading) return (
    <div className="max-w-md mx-auto min-h-screen flex items-center justify-center">
      <div className="w-9 h-9 border-3 border-gray-200 border-t-brand rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen pb-24">
      <div className="sticky top-0 bg-[#f8f7f4] z-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
        <button className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center shadow-sm" onClick={onBack}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="font-display text-xl font-extrabold gradient-text">{t(lang, 'messages')}</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 pt-4">
        {conversations.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="font-display text-xl font-bold mb-2">{t(lang, 'noConversations')}</h3>
            <p className="text-gray-400 text-sm">{t(lang, 'startConv')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {conversations.map(conv => {
              const other = getOtherUser(conv);
              if (!other) return null;
              return (
                <button
                  key={conv.id}
                  className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 text-left shadow-sm active:scale-[0.99] transition-transform"
                  onClick={() => onOpenChat(conv.id, other.id, other.display_name || other.username, other.avatar_url)}
                >
                  {other.avatar_url ? (
                    <img src={other.avatar_url} alt="" className="w-12 h-12 rounded-2xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl gradient-btn flex items-center justify-center text-white font-extrabold font-display flex-shrink-0">
                      {(other.display_name || other.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{other.display_name || other.username}</div>
                    <div className="text-xs text-gray-400 truncate mt-0.5">
                      {conv.lastMessage ? (
                        <span>{conv.lastMessage.sender_id === user.id ? 'Вы: ' : ''}{conv.lastMessage.text}</span>
                      ) : (
                        <span className="italic">Нет сообщений</span>
                      )}
                    </div>
                  </div>
                  {conv.lastMessage && (
                    <div className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(conv.lastMessage.created_at, lang)}</div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
