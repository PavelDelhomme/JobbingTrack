'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('pavel@jobbingtrack.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login, isAuthenticated, user } = useAuth();

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            🎯 JobbingTrack Backoffice
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Connectez-vous pour accéder au backoffice
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              ❌ {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? '⏳ Connexion...' : '🚀 Se connecter'}
          </button>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-xs text-blue-800">
              <strong>🧪 Compte de test :</strong><br/>
              <strong>Email:</strong> pavel@jobbingtrack.com<br/>
              <strong>Mot de passe:</strong> password123
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
