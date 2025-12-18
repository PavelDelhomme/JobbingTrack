'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
// ✅ OPTIMISATION: Import depuis le baril pour permettre le tree-shaking
import { Lock, CheckCircle, XCircle, Eye, EyeOff, AlertCircle } from '@/lib/icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Vérifier la validité du token au chargement
  useEffect(() => {
    const verifyToken = async () => {
      try {
        setVerifying(true);
        const response = await axios.get(
          `${API_URL}/api/v1/auth/reset-password/${token}`
        );

        if (response.data.success && response.data.valid) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setError('Ce lien de réinitialisation est invalide ou a expiré.');
        }
      } catch (err: any) {
        console.error('Erreur vérification token:', err);
        setTokenValid(false);
        setError(
          err.response?.data?.error ||
            'Ce lien de réinitialisation est invalide ou a expiré.'
        );
      } finally {
        setVerifying(false);
      }
    };

    if (token) {
      verifyToken();
    }
  }, [token]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 6) {
      return 'Le mot de passe doit contenir au moins 6 caractères';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Le mot de passe doit contenir au moins une majuscule';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Le mot de passe doit contenir au moins une minuscule';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Le mot de passe doit contenir au moins un chiffre';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!password || !confirmPassword) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await axios.post(
        `${API_URL}/api/v1/auth/reset-password/${token}`,
        { password }
      );

      if (response.data.success) {
        setSuccess(true);

        // Rediriger vers la page de connexion après 3 secondes
        setTimeout(() => {
          router.push('/login?reset=success');
        }, 3000);
      } else {
        setError(
          response.data.error || 'Une erreur est survenue lors de la réinitialisation'
        );
      }
    } catch (err: any) {
      console.error('Erreur reset password:', err);
      setError(
        err.response?.data?.error || 'Une erreur est survenue lors de la réinitialisation'
      );
    } finally {
      setLoading(false);
    }
  };

  // Écran de vérification du token
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Vérification du lien de réinitialisation...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Écran de succès
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="flex flex-col items-center text-center">
            <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-4 mb-4">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Mot de passe réinitialisé !
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Votre mot de passe a été réinitialisé avec succès.
              Vous allez être redirigé vers la page de connexion...
            </p>
            <div className="animate-pulse text-blue-600 dark:text-blue-400">
              Redirection en cours...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Écran d'erreur de token invalide
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="flex flex-col items-center text-center">
            <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-4 mb-4">
              <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Lien invalide ou expiré
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || 'Ce lien de réinitialisation est invalide ou a expiré.'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Les liens de réinitialisation sont valides pendant 1 heure.
              Veuillez demander un nouveau lien.
            </p>
            <button
              onClick={() => router.push('/forgot-password')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Demander un nouveau lien
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Formulaire de réinitialisation
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-4 mb-4">
            <Lock className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Nouveau mot de passe
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-center">
            Choisissez un nouveau mot de passe sécurisé pour votre compte
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="mt-2 space-y-1">
              <p className={`text-xs ${password.length >= 6 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                ✓ Au moins 6 caractères
              </p>
              <p className={`text-xs ${/[A-Z]/.test(password) ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                ✓ Une lettre majuscule
              </p>
              <p className={`text-xs ${/[a-z]/.test(password) ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                ✓ Une lettre minuscule
              </p>
              <p className={`text-xs ${/[0-9]/.test(password) ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                ✓ Un chiffre
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                Les mots de passe ne correspondent pas
              </p>
            )}
            {confirmPassword && password === confirmPassword && (
              <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                ✓ Les mots de passe correspondent
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Réinitialisation...</span>
              </>
            ) : (
              <>
                <Lock className="h-5 w-5" />
                <span>Réinitialiser le mot de passe</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    </div>
  );
}
