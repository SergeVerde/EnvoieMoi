'use client';

import { useState, useEffect, useRef } from 'react';
import { t, timeAgo } from '@/lib/i18n';

export default function ChatScreen({ supabase, user, conversationId, otherUserId, otherName, otherAvatar, lang, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [convId, setConvId] = useState(conversationId);
  const [isBlocked, setIsBlocked] = useState(false);
  const convIdRef = useRef(conversationId);
  const bottomRef = useRef(null);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function load() {
    setLoading(true);
    let cid = convIdRef.current;

    if (!cid) {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        cid = existing.id;
      } else {
        const { data: created } = await supabase
          .from('conversations')
          .insert({ user1_id: user.id, user2_id: otherUserId, last_message_at: new Date().toISOString() })
          .select()
          .single();
        cid = created?.id;
      }
      convIdRef.current = cid;
      setConvId(cid);
    }

    const { data: blockData } = await supabase
      .from('blocks')
      .select('blocker_id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', otherUserId)
      .maybeSingle();
    setIsBlocked(!!blockData);

    if (cid) {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', cid)
        .order('created_at', { ascending: true });
      setMessages(data || []);

      // Mark received messages as read
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', cid)
        .neq('sender_id', user.id)
        .is('read_at', null);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!convId) return;

    const channel = supabase
      .channel(`chat:${convId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${convId}`,
      }, async (payload) => {
        const msg = payload.new;
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Mark as read if received (not sent by me)
        if (msg.sender_id !== user.id) {
          await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', msg.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [convId]);

  async function sendMessage() {
    const cid = convIdRef.current;
    if (!text.trim() || !cid) return;
    const msg = text.trim();
    setText('');
    const { data: newMsg } = await supabase.from('messages').insert({
      conversation_id: cid,
      sender_id: user.id,
      text: msg,
    }).select().single();
    if (newMsg) setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', cid);
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white z-50 border-b border-gray-100 px-5 py-4 flex items-center gap-3">
        <button className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center shadow-sm flex-shrink-0" onClick={onBack}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        {otherAvatar ? (
          <img src={otherAvatar} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-xl gradient-btn flex items-center justify-center text-white font-bold font-display flex-shrink-0">
            {(otherName || '?')[0].toUpperCase()}
          </div>
        )}
        <div className="font-bold text-sm">{otherName}</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-24 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-8 h-8 border-3 border-gray-200 border-t-brand rounded-full animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">Начните общение!</div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === user.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-brand text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'}`}>
                  <p>{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-gray-400'}`}>{timeAgo(msg.created_at, lang)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input or blocked banner */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] bg-white/95 backdrop-blur border-t border-gray-100">
        {isBlocked ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 flex-1">Вы заблокировали этого пользователя</p>
            <button
              className="text-xs text-brand font-bold flex-shrink-0"
              onClick={async () => {
                await supabase.from('blocks').delete().eq('blocker_id', user.id).eq('blocked_id', otherUserId);
                setIsBlocked(false);
              }}
            >Разблокировать</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-2xl text-sm outline-none focus:border-brand bg-white transition-colors"
              placeholder={t(lang, 'typeMessage')}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            />
            <button
              className="w-11 h-11 rounded-2xl gradient-btn flex items-center justify-center text-white flex-shrink-0 shadow-sm disabled:opacity-50"
              disabled={!text.trim()}
              onClick={sendMessage}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
