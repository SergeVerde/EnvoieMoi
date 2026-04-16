'use client';

import { useState } from 'react';

export default function AuthScreen({ supabase }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleEmail = async () => {
    if (!email.trim()) return;
    await supabase.auth.signInWithOtp({ email: email.trim() });
    setSent(true);
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex items-center justify-center px-5">
      <div className="text-center w-full">
        <div className="text-6xl mb-6">👨‍🍳</div>
        <h1 className="font-display text-3xl font-extrabold gradient-text mb-2">Рецептник</h1>
        <p className="text-gray-500 mb-8">Социальная сеть рецептов</p>

        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 max-w-xs mx-auto">
            <div className="text-3xl mb-2">📧</div>
            <p className="text-sm text-green-800 font-semibold">Проверь почту!</p>
            <p className="text-xs text-green-600 mt-1">Ссылка для входа отправлена на {email}</p>
          </div>
        ) : (
          <div className="max-w-xs mx-auto space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm outline-none focus:border-amber-500 bg-white"
              onKeyDown={e => e.key === 'Enter' && handleEmail()}
            />
            <button
              onClick={handleEmail}
              className="w-full py-3 gradient-btn text-white rounded-2xl text-sm font-bold"
            >
              Войти по Email
            </button>
            <div className="text-xs text-gray-400">или</div>
            <button
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold hover:border-amber-500 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Войти через Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
