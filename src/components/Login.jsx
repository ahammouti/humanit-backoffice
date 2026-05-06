import React, { useState } from 'react';
import { Sparkles, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export default function Login() {
  const { login, logAction } = useApp();
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      logAction('🔐 Connexion', user.name, `Connexion en tant que ${user.role}`);
    } catch {
      setError('Email ou mot de passe incorrect.');
      setLoading(false);
    }
  };

  const quickLogin = (u) => { setEmail(u.email); setPassword(u.password); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-white text-2xl font-bold">
            <Sparkles className="h-7 w-7 text-blue-300" />
            Humanit'R
          </div>
          <p className="text-blue-300 text-sm mt-1">Back Office</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Connexion</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="votre@email.com"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-11 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Se connecter
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2.5">
              Comptes de démonstration :
            </p>
            <div className="space-y-2">
              {[
                { email: 'admin@humanit.fr',     password: 'admin123', role: 'Admin',     color: 'text-purple-600 dark:text-purple-400' },
                { email: 'tresorier@humanit.fr', password: 'treso123', role: 'Trésorier', color: 'text-blue-600 dark:text-blue-400' },
                { email: 'benevole@humanit.fr',  password: 'benev123', role: 'Bénévole',  color: 'text-green-600 dark:text-green-400' },
              ].map(u => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => quickLogin(u)}
                  className="w-full flex items-center justify-between text-xs hover:bg-gray-100 dark:hover:bg-gray-600 px-2 py-1.5 rounded-lg transition-colors group"
                >
                  <span className={`font-semibold ${u.color}`}>{u.role}</span>
                  <span className="text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 font-mono">
                    {u.email}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
