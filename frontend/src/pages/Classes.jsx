import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { GraduationCap, Plus, Search, Users, ClipboardList, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Spinner from '../components/ui/Spinner.jsx';

const NIVEAUX = ['2nde Pro', '1ère Pro', 'Terminale Pro', 'CAP 1', 'CAP 2', 'BTS 1', 'BTS 2'];

function FormulaireClasse({ onSubmit, onClose, loading, erreurApi, annees }) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const anneeActive = annees.find((a) => a.actif);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Nouvelle classe</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la classe</label>
            <input
              {...register('nom', { required: 'Le nom est requis' })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="ex : 1MELEC-A"
            />
            {errors.nom && <p className="text-xs text-red-500 mt-1">{errors.nom.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
            <select
              {...register('niveau', { required: 'Le niveau est requis' })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Choisir un niveau…</option>
              {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            {errors.niveau && <p className="text-xs text-red-500 mt-1">{errors.niveau.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Année scolaire</label>
            {annees.length === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                Aucune année scolaire n'existe encore. Créez-en une depuis « Paramètres &gt; Années scolaires » avant de créer une classe.
              </p>
            ) : (
              <select
                defaultValue={anneeActive?.libelle ?? ''}
                {...register('annee', { required: "L'année est requise" })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="" disabled>Choisir une année…</option>
                {annees.map((a) => (
                  <option key={a.id} value={a.libelle}>
                    {a.libelle}{a.actif ? ' (active)' : ''}
                  </option>
                ))}
              </select>
            )}
            {errors.annee && <p className="text-xs text-red-500 mt-1">{errors.annee.message}</p>}
          </div>
          {erreurApi && <p className="text-sm text-red-600">{erreurApi}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || annees.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading && <Spinner size="sm" />}
              Créer la classe
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Classes() {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [recherche, setRecherche] = useState('');
  const [showForm, setShowForm] = useState(false);

  const peutGerer = utilisateur?.role === 'ADMIN';

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['classes', recherche],
    queryFn: () => api.get('/classes', { params: { search: recherche || undefined } }).then((r) => r.data),
  });

  const { data: annees = [] } = useQuery({
    queryKey: ['annees'],
    queryFn: () => api.get('/annees').then((r) => r.data),
    enabled: peutGerer,
  });

  const creer = useMutation({
    mutationFn: (data) => api.post('/classes', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes'] }); setShowForm(false); },
  });

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? '…' : `${classes.length} classe${classes.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {peutGerer && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvelle classe
          </button>
        )}
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher une classe…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <GraduationCap className="w-12 h-12 mb-3 opacity-40" />
          <p className="font-medium text-gray-500">Aucune classe</p>
          <p className="text-sm mt-1">
            {recherche ? 'Aucun résultat pour cette recherche' : 'Créez votre première classe pour commencer'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {classes.map((classe) => (
            <button
              key={classe.id}
              onClick={() => navigate(`/classes/${classe.id}`)}
              className="text-left bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all p-5 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
                  <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 mt-1 transition-colors" />
              </div>
              <h3 className="font-semibold text-gray-900">{classe.nom}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{classe.niveau} · {classe.annee}</p>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Users className="w-3.5 h-3.5" />
                  <span>{classe._count?.eleves ?? 0} élève{classe._count?.eleves !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>{classe._count?.evaluations ?? 0} éval.</span>
                </div>
                {!classe.actif && (
                  <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <FormulaireClasse
          onSubmit={(data) => creer.mutate(data)}
          onClose={() => setShowForm(false)}
          loading={creer.isPending}
          erreurApi={creer.error?.response?.data?.message}
          annees={annees}
        />
      )}
    </div>
  );
}
