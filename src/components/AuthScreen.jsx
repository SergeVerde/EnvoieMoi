'use client';

import { useState } from 'react';

export default function AuthScreen({ supabase }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');

    if (isSignUp) {
      const { error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: { full_name: email.split('@')[0] },
          emailRedirectTo: window.location.origin + '/auth/callback',
        },
      });
      if (err) setError(err.message);
      else setCheckEmail(true);
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (err) setError(err.message);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    });
  };

  if (checkEmail) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex items-center justify-center px-5">
        <div className="text-center w-full">
          <div className="text-6xl mb-6">📧</div>
          <h1 className="font-display text-2xl font-extrabold mb-2">Проверь почту!</h1>
          <p className="text-gray-500 mb-6 text-sm">
            Мы отправили ссылку для подтверждения на<br/>
            <strong>{email}</strong>
          </p>
          <p className="text-gray-400 text-xs mb-6">
            Нажми на ссылку в письме — ты автоматически войдёшь в приложение
          </p>
          <button
            onClick={() => { setCheckEmail(false); setIsSignUp(false); }}
            className="text-xs text-green-600 font-semibold"
          >
            Уже подтвердил? Войти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex items-center justify-center px-5">
      <div className="text-center w-full">
        <div className="w-16 h-16 rounded-2xl gradient-btn flex items-center justify-center mx-auto mb-5 shadow-lg shadow-green-700/20">
          <span className="text-2xl">🌿</span>
        </div>
        <h1 className="font-display text-3xl font-extrabold gradient-text mb-1">Pestogram</h1>
        <p className="text-gray-400 text-sm mb-8">Социальная сеть рецептов</p>

        <div className="max-w-xs mx-auto space-y-3">
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm font-semibold hover:border-green-400 hover:shadow-sm transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Войти через Google
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-xs text-gray-400">или</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm outline-none focus:border-green-500 bg-white transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Пароль (мин. 6 символов)"
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm outline-none focus:border-green-500 bg-white transition-colors"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />

          {error && (
            <div className="text-xs text-red-500 bg-red-50 rounded-xl p-3">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 gradient-btn text-white rounded-2xl text-sm font-bold disabled:opacity-50 shadow-sm"
          >
            {loading ? '...' : isSignUp ? 'Зарегистрироваться' : 'Войти'}
          </button>

          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isSignUp ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </div>
      </div>
    </div>
  );
}
