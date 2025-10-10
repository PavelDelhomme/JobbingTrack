'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@jobbingtrack.test');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login, isAuthenticated, user } = useAuth();
  const { actualTheme, toggleTheme } = useTheme();

  // ✅ Si déjà connecté, rediriger automatiquement
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('✅ Déjà connecté, redirection vers /backoffice...');
      router.push('/backoffice');
    }
  }, [isAuthenticated, user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Tentative de connexion...');
      
      // ✅ UTILISER LA FONCTION login() du contexte d'authentification
      await login(email, password);
      
      console.log('✅ Login réussi, redirection vers /backoffice...');
      
      // La redirection est gérée automatiquement par le useEffect ci-dessus
      // ou directement par la fonction login() dans auth.tsx
      
    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8">
        {/* Theme Toggle */}
        <div className="flex justify-end">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              actualTheme === 'dark'
                ? 'bg-gray-800 text-gray-100 hover:bg-gray-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={actualTheme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            <span className="text-lg">{actualTheme === 'dark' ? '🌙' : '☀️'}</span>
            <span className="text-xs font-medium">
              {actualTheme === 'dark' ? 'Sombre' : 'Clair'}
            </span>
          </button>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            🎯 JobbingTrack Backoffice
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Connectez-vous pour accéder au backoffice
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              ❌ {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? '⏳ Connexion...' : '🚀 Se connecter'}
          </button>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="text-xs text-blue-800 dark:text-blue-200">
              <strong>🧪 Compte de test :</strong><br/>
              <strong>Email:</strong> admin@jobbingtrack.test<br/>
              <strong>Mot de passe:</strong> password123
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
