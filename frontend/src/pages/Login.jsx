import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from '../components/ui/Spinner.jsx';

export default function Login() {
  const { utilisateur, connexion } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', motDePasse: '' });
  const [visible, setVisible] = useState(false);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  // Déjà connecté → rediriger
  useEffect(() => {
    if (utilisateur) navigate('/', { replace: true });
  }, [utilisateur, navigate]);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (erreur) setErreur('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.motDePasse) {
      setErreur('Veuillez remplir tous les champs.');
      return;
    }
    setChargement(true);
    setErreur('');
    try {
      await connexion(form.email, form.motDePasse);
      navigate('/', { replace: true });
    } catch (err) {
      setErreur(err.response?.data?.message ?? 'Identifiants invalides.');
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-indigo-600 items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">EvalPro</h1>
          <p className="text-slate-400 text-sm mt-1">Lycée Professionnel — Gestion des évaluations</p>
        </div>

        {/* Carte */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Connexion</h2>

          {erreur && (
            <div className="mb-4 flex items-start gap-2 bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-lg border border-red-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{erreur}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Adresse e-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="prenom.nom@lycee.fr"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label htmlFor="motDePasse" className="block text-sm font-medium text-gray-700 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="motDePasse"
                  name="motDePasse"
                  type={visible ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.motDePasse}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Bouton */}
            <button
              type="submit"
              disabled={chargement}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {chargement ? <Spinner size="sm" className="border-white border-t-indigo-300" /> : null}
              {chargement ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-5">
            Mot de passe oublié ? Contactez l'administration de votre établissement.
          </p>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          EvalPro © 2026
        </p>
      </div>
    </div>
  );
}
