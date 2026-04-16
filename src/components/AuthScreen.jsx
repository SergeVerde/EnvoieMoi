'use client';

import { useState } from 'react';

export default function AuthScreen({ supabase }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');

    if (isSignUp) {
      const { error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: { data: { full_name: email.split('@')[0] } },
      });
      if (err) setError(err.message);
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (err) setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex items-center justify-center px-5">
      <div className="text-center w-full">
        <div className="text-6xl mb-6">👨‍🍳</div>
        <h1 className="font-display text-3xl font-extrabold gradient-text mb-2">Рецептник</h1>
        <p className="text-gray-500 mb-8">Социальная сеть рецептов</p>

        <div className="max-w-xs mx-auto space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm outline-none focus:border-amber-500 bg-white"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Пароль (мин. 6 символов)"
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm outline-none focus:border-amber-500 bg-white"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />

          {error && (
            <div className="text-xs text-red-500 bg-red-50 rounded-xl p-3">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 gradient-btn text-white rounded-2xl text-sm font-bold disabled:opacity-50"
          >
            {loading ? '...' : isSignUp ? 'Зарегистрироваться' : 'Войти'}
          </button>

          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            className="text-xs text-gray-400"
          >
            {isSignUp ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </div>
      </div>
    </div>
  );
}
