'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/auth';
import { useTheme } from '@/lib/hooks/theme';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const router = useRouter();
  const { login, isAuthenticated, user } = useAuth();
  const { actualTheme, toggleTheme } = useTheme();

  // ✅ Si déjà connecté, rediriger automatiquement
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('✅ Already logged in, redirecting to /b4ck0ff1ce...');
      // Forcer la redirection immédiatement
      router.push('/b4ck0ff1ce');
      router.refresh();
    }
  }, [isAuthenticated, user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Empêcher les clics multiples
    if (loading) {
      return;
    }

    setLoading(true);
    setError('');
    setLoginAttempts(prev => prev + 1);

    try {
      console.log('🔐 Tentative de connexion...', loginAttempts + 1);

      // ✅ UTILISER LA FONCTION login() du contexte d'authentification
      await login(email, password);

      console.log('✅ Login successful, redirecting immediately...');

      // Attendre un court instant pour que le cookie soit bien défini
      await new Promise(resolve => setTimeout(resolve, 100));

      // Forcer la redirection immédiatement
      router.push('/b4ck0ff1ce');
      router.refresh(); // Forcer le rafraîchissement pour que le middleware se déclenche

    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">

        {/* Card principale avec shadow et bordure */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Header avec gradient */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 px-6 sm:px-8 py-8 sm:py-10">
            {/* Header avec logo et bouton thème compact */}
            <div className="flex justify-between items-start mb-6 sm:mb-8">
              <div className="text-4xl sm:text-5xl animate-bounce">🎯</div>
              <button
                onClick={toggleTheme}
                className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all shadow-lg hover:shadow-xl transform hover:scale-105 ${
                  actualTheme === 'dark'
                    ? 'bg-gray-800 text-gray-100 hover:bg-gray-700 border border-gray-700'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
                title={actualTheme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
              >
                <span className="text-lg sm:text-xl">{actualTheme === 'dark' ? '🌙' : '☀️'}</span>
              </button>
            </div>

            {/* Titre centré */}
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white drop-shadow-lg">
                JobbingTrack
              </h2>
              <p className="mt-2 sm:mt-3 text-sm sm:text-base text-blue-100">
                Backoffice Administrateur
              </p>
            </div>
          </div>

          {/* Formulaire */}
          <form className="px-6 sm:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 sm:py-4 rounded-xl flex items-start gap-3 animate-shake">
                <span className="text-xl sm:text-2xl">❌</span>
                <span className="text-sm sm:text-base flex-1">{error}</span>
              </div>
            )}

            {/* Message d'information pendant la connexion */}
            {loading && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-4 py-3 sm:py-4 rounded-xl flex items-start gap-3 animate-pulse">
                <span className="text-xl sm:text-2xl">🔄</span>
                <div className="flex-1">
                  <p className="text-sm sm:text-base font-medium">Authentification en cours...</p>
                  <p className="text-xs sm:text-sm opacity-75 mt-1">
                    Veuillez patienter pendant que nous vérifions vos identifiants et vous redirigeons automatiquement.
                  </p>
                </div>
              </div>
            )}

            {/* Message de succès temporaire */}
            {isAuthenticated && user && !loading && (
              <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 sm:py-4 rounded-xl flex items-start gap-3 animate-pulse">
                <span className="text-xl sm:text-2xl">✅</span>
                <div className="flex-1">
                  <p className="text-sm sm:text-base font-medium">Connexion réussie !</p>
                  <p className="text-xs sm:text-sm opacity-75 mt-1">
                    Redirection en cours vers le backoffice...
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                📧 Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                className="w-full px-4 sm:px-5 py-3 sm:py-4 text-base sm:text-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                placeholder="redacted@example.invalid"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                🔐 Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 sm:px-5 py-3 sm:py-4 pr-12 sm:pr-14 text-base sm:text-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-2xl sm:text-3xl hover:scale-110 transition-transform touch-manipulation"
                  title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 sm:py-5 px-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-lg transform transition-all duration-200 touch-manipulation ${
                loading
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400 text-white cursor-not-allowed animate-pulse'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 hover:from-blue-700 hover:to-purple-700 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {loading ? (
                <span className="flex flex-col items-center justify-center gap-3">
                  <span className="animate-spin text-3xl text-white">🔄</span>
                  <span className="text-lg font-bold text-white">Connexion en cours...</span>
                  <div className="flex items-center gap-2 text-white">
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-sm text-blue-100">Vérification des identifiants...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span className="text-xl">🚀</span>
                  <span>Se connecter</span>
                </span>
              )}
            </button>

            {/* Info compte de test - Card améliorée */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl sm:rounded-2xl p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl sm:text-3xl">🧪</span>
                <div className="flex-1 text-xs sm:text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-bold mb-2 text-sm sm:text-base">Compte de test :</p>
                  <div className="space-y-1">
                    <p><strong>Email:</strong> admin@jobbingtrack.test</p>
                    <p><strong>Mot de passe:</strong> password123</p>
                  </div>
                  <p className="mt-3 text-xs text-blue-700 dark:text-blue-300 italic">
                    💡 Les champs sont pré-remplis pour faciliter les tests
                  </p>
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="px-6 sm:px-8 pb-6 sm:pb-8 text-center">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              © 2025 JobbingTrack • Version 1.0.0
            </p>
          </div>
        </div>

        {/* Message d'aide mobile */}
        <div className="text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 px-4">
          <p className="sm:hidden">📱 Optimisé pour mobile</p>
          <p className="hidden sm:block">🖥️ Interface responsive - Accessible sur tous vos appareils</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
