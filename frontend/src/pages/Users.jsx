import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Users as UsersIcon, Plus, Search, UserCheck, UserX, UserRoundCheck,
  ChevronDown, X, Check, Shield, Upload, Download,
  CheckCircle2, AlertCircle, FileSpreadsheet, GraduationCap,
  Pencil, Trash2, AlertTriangle, Lock,
} from 'lucide-react';
import clsx from 'clsx';
import api from '../services/api.js';
import Card from '../components/ui/Card.jsx';
import Spinner from '../components/ui/Spinner.jsx';

const ROLES = ['ADMIN', 'ENSEIGNANT', 'ELEVE'];
const NIVEAUX = ['2nde Pro', '1ère Pro', 'Terminale Pro', 'CAP 1', 'CAP 2', 'BTS 1', 'BTS 2'];

const ROLE_STYLES = {
  ADMIN:      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  ENSEIGNANT: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  ELEVE:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_STYLES[role] ?? 'bg-gray-100 text-gray-600'}`}>
      {role}
    </span>
  );
}

/* ─── Mini-modal création de classe (z-[60] pour passer au-dessus) ─── */

function MiniModalCreerClasse({ onCreee, onFermer }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const { data: annees = [] } = useQuery({
    queryKey: ['annees'],
    queryFn: () => api.get('/annees').then((r) => r.data),
  });
  const anneeActive = annees.find((a) => a.actif);

  const mutation = useMutation({
    mutationFn: (data) => api.post('/classes', data).then((r) => r.data),
    onSuccess: (classe) => {
      qc.invalidateQueries({ queryKey: ['classes-creation'] });
      qc.invalidateQueries({ queryKey: ['classes-import'] });
      qc.invalidateQueries({ queryKey: ['classes-liste'] });
      onCreee(classe);
    },
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-50 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            Nouvelle classe
          </h3>
          <button onClick={onFermer} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Nom de la classe *</label>
            <input
              {...register('nom', { required: true })}
              placeholder="ex : 1EPC-A"
              className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.nom && <p className="text-xs text-red-500 mt-1">Requis</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Niveau *</label>
            <select
              {...register('niveau', { required: true })}
              className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700"
            >
              <option value="">Choisir…</option>
              {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            {errors.niveau && <p className="text-xs text-red-500 mt-1">Requis</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Année scolaire *</label>
            {annees.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Aucune année scolaire — créez-en une depuis « Paramètres &gt; Années scolaires ».
              </p>
            ) : (
              <select
                defaultValue={anneeActive?.libelle ?? ''}
                {...register('annee', { required: true })}
                className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700"
              >
                <option value="" disabled>Choisir…</option>
                {annees.map((a) => (
                  <option key={a.id} value={a.libelle}>{a.libelle}{a.actif ? ' (active)' : ''}</option>
                ))}
              </select>
            )}
            {errors.annee && <p className="text-xs text-red-500 mt-1">Requis</p>}
          </div>
          {mutation.error && (
            <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {mutation.error?.response?.data?.message ?? 'Erreur lors de la création'}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onFermer} className="px-3 py-1.5 text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={mutation.isPending || annees.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {mutation.isPending ? <Spinner size="sm" /> : <Check className="w-3.5 h-3.5" />}
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Modal création unitaire ─────────────────────────────── */

function ModalCreerUtilisateur({ onFermer }) {
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm({
    defaultValues: { role: 'ELEVE' },
  });
  const qc = useQueryClient();
  const [classeId, setClasseId] = useState('');
  const [miniClasse, setMiniClasse] = useState(false);

  const roleActuel = watch('role');

  const { data: classesRaw = [] } = useQuery({
    queryKey: ['classes-creation'],
    queryFn: () => api.get('/classes', { params: { actif: true } }).then((r) => r.data),
  });
  const classes = Array.isArray(classesRaw) ? classesRaw : (classesRaw?.classes ?? []);

  const mutation = useMutation({
    mutationFn: (data) => api.post('/users', { ...data, classeId: classeId || undefined }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['classe'] });
      reset(); onFermer();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-50">Créer un utilisateur</h2>
          <button onClick={onFermer} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Prénom *</label>
              <input {...register('prenom', { required: true })} className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {errors.prenom && <p className="text-xs text-red-500 mt-1">Requis</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Nom *</label>
              <input {...register('nom', { required: true })} className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {errors.nom && <p className="text-xs text-red-500 mt-1">Requis</p>}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Email *</label>
            <input type="email" {...register('email', { required: true })} className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {errors.email && <p className="text-xs text-red-500 mt-1">Email valide requis</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Mot de passe *</label>
            <input type="password" {...register('motDePasse', { required: true, minLength: 8 })} className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="8 caractères minimum" />
            {errors.motDePasse && <p className="text-xs text-red-500 mt-1">8 caractères minimum</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Rôle</label>
            <select {...register('role')} className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Sélecteur de classe — uniquement pour les élèves */}
          {roleActuel === 'ELEVE' && (
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Classe</label>
              <div className="flex gap-2">
                <select
                  value={classeId}
                  onChange={(e) => setClasseId(e.target.value)}
                  className="flex-1 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700"
                >
                  <option value="">— Sans classe —</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setMiniClasse(true)}
                  title="Créer une nouvelle classe"
                  className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Créer
                </button>
              </div>
            </div>
          )}

          {mutation.error && (
            <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {mutation.error?.response?.data?.message ?? 'Erreur lors de la création'}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onFermer} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Annuler</button>
            <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2">
              {mutation.isPending ? <Spinner size="sm" /> : <Check className="w-4 h-4" />}
              Créer
            </button>
          </div>
        </form>
      </div>

      {miniClasse && (
        <MiniModalCreerClasse
          onCreee={(c) => { setClasseId(c.id); setMiniClasse(false); }}
          onFermer={() => setMiniClasse(false)}
        />
      )}
    </div>
  );
}

/* ─── Modal édition ──────────────────────────────────────── */

function ModalModifierUtilisateur({ utilisateur: u, onFermer }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: { prenom: u.prenom, nom: u.nom, email: u.email, role: u.role, motDePasse: '' },
  });

  const [classeId, setClasseId] = useState(u.classe?.classe?.id ?? '');
  const [miniClasse, setMiniClasse] = useState(false);
  const roleActuel = watch('role');

  const { data: classesRaw = [] } = useQuery({
    queryKey: ['classes-creation'],
    queryFn: () => api.get('/classes', { params: { actif: true } }).then((r) => r.data),
  });
  const classes = Array.isArray(classesRaw) ? classesRaw : (classesRaw?.classes ?? []);

  const mutation = useMutation({
    mutationFn: async (data) => {
      const payload = { prenom: data.prenom, nom: data.nom, email: data.email, role: data.role };
      if (data.motDePasse) payload.motDePasse = data.motDePasse;
      await api.put(`/users/${u.id}`, payload);
      if (data.role === 'ELEVE') {
        await api.patch(`/users/${u.id}/classe`, { classeId: classeId || null });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['classe'] });
      onFermer();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-50">Modifier le compte</h2>
          <button onClick={onFermer} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Prénom *</label>
              <input {...register('prenom', { required: true })} className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {errors.prenom && <p className="text-xs text-red-500 mt-1">Requis</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Nom *</label>
              <input {...register('nom', { required: true })} className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {errors.nom && <p className="text-xs text-red-500 mt-1">Requis</p>}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Email *</label>
            <input type="email" {...register('email', { required: true })} className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {errors.email && <p className="text-xs text-red-500 mt-1">Email valide requis</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Rôle</label>
            {u.role === 'ADMIN' ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg">
                <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-red-700 dark:text-red-400">ADMIN</span>
                <span className="text-xs text-gray-400 ml-1">— rôle protégé, non modifiable</span>
              </div>
            ) : (
              <select {...register('role')} className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {ROLES.filter((r) => r !== 'ADMIN').map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
          </div>

          {/* Sélecteur de classe — visible pour les élèves */}
          {roleActuel === 'ELEVE' && (
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Classe</label>
              <div className="flex gap-2">
                <select
                  value={classeId}
                  onChange={(e) => setClasseId(e.target.value)}
                  className="flex-1 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700"
                >
                  <option value="">— Sans classe —</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setMiniClasse(true)}
                  title="Créer une nouvelle classe"
                  className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Créer
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Nouveau mot de passe</label>
            <input type="password" {...register('motDePasse', { minLength: { value: 8, message: '8 caractères minimum' } })} placeholder="Laisser vide pour ne pas modifier" className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {errors.motDePasse && <p className="text-xs text-red-500 mt-1">{errors.motDePasse.message}</p>}
          </div>

          {mutation.error && (
            <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {mutation.error?.response?.data?.message ?? 'Erreur lors de la modification'}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onFermer} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Annuler</button>
            <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2">
              {mutation.isPending ? <Spinner size="sm" /> : <Check className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>

      {miniClasse && (
        <MiniModalCreerClasse
          onCreee={(c) => { setClasseId(c.id); setMiniClasse(false); }}
          onFermer={() => setMiniClasse(false)}
        />
      )}
    </div>
  );
}

/* ─── Modal import en masse ───────────────────────────────── */

function ModalImportUtilisateurs({ onFermer }) {
  const qc = useQueryClient();
  const inputRef = useRef(null);
  const [fichier, setFichier] = useState(null);
  const [drag, setDrag] = useState(false);
  const [miniClasse, setMiniClasse] = useState(false);

  const { data: classesRaw } = useQuery({
    queryKey: ['classes-import'],
    queryFn: () => api.get('/classes', { params: { actif: true } }).then((r) => r.data),
  });
  const classes = Array.isArray(classesRaw) ? classesRaw : (classesRaw?.classes ?? []);

  const mutation = useMutation({
    mutationFn: (file) => {
      const form = new FormData();
      form.append('fichier', file);
      return api.post('/users/import', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['classe'] });
    },
  });

  const choisirFichier = (f) => {
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) { setFichier(f); mutation.reset(); }
  };

  const onDrop = (e) => { e.preventDefault(); setDrag(false); choisirFichier(e.dataTransfer.files[0]); };

  const resultat = mutation.data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-50">Import en masse</h2>
          </div>
          <button onClick={onFermer} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {resultat ? (
            <div className="space-y-4">
              {/* Compteurs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{resultat.crees.length}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500">créé{resultat.crees.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">{resultat.erreurs.length}</p>
                    <p className="text-xs text-red-500 dark:text-red-400">erreur{resultat.erreurs.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>

              {/* Comptes créés */}
              {resultat.crees.length > 0 && (
                <div className="rounded-xl border border-emerald-100 dark:border-emerald-900 overflow-hidden">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-900">Comptes créés</p>
                  <div className="max-h-40 overflow-y-auto divide-y divide-emerald-50 dark:divide-emerald-900/20">
                    {resultat.crees.map((u, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                        <span className="font-medium text-gray-700 dark:text-slate-300 flex-1">{u.prenom} {u.nom}</span>
                        <span className="text-gray-400 truncate max-w-[130px]">{u.email}</span>
                        {u.classe
                          ? <span className="text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">{u.classe}</span>
                          : <span className="text-gray-300 dark:text-slate-600 italic">sans classe</span>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Erreurs */}
              {resultat.erreurs.length > 0 && (
                <div className="rounded-xl border border-red-100 dark:border-red-900 overflow-hidden">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 px-3 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900">Erreurs — lignes ignorées</p>
                  <div className="max-h-36 overflow-y-auto divide-y divide-red-50 dark:divide-red-900/30">
                    {resultat.erreurs.map((e, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-2 text-xs">
                        <span className="font-mono text-gray-400 flex-shrink-0">L.{e.ligne}</span>
                        <span className="text-gray-500 dark:text-slate-400 truncate flex-1">{e.email}</span>
                        <span className="text-red-600 dark:text-red-400 text-right shrink-0">{e.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={onFermer} className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">Fermer</button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={async () => {
                  const res = await api.get('/users/import/modele', { responseType: 'blob' });
                  const url = URL.createObjectURL(res.data);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'modele_utilisateurs.xlsx'; a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Download className="w-4 h-4" />
                Télécharger le modèle Excel
              </button>

              <div
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={clsx(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                  drag ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                  : fichier ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-gray-200 dark:border-slate-600 hover:border-indigo-300 hover:bg-gray-50 dark:hover:bg-slate-700/40'
                )}
              >
                <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => choisirFichier(e.target.files[0])} />
                {fichier ? (
                  <>
                    <FileSpreadsheet className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{fichier.name}</p>
                    <p className="text-xs text-gray-400 mt-1">Cliquer pour changer</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-300 dark:text-slate-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-300">Déposer le fichier ici</p>
                    <p className="text-xs text-gray-400 mt-1">ou cliquer pour parcourir — .xlsx uniquement</p>
                  </>
                )}
              </div>

              <p className="text-xs text-gray-400 dark:text-slate-500">
                Colonnes : <span className="font-mono">Prénom</span>, <span className="font-mono">Nom</span>, <span className="font-mono">Email</span>, <span className="font-mono">Rôle</span>, <span className="font-mono">Classe</span>, <span className="font-mono">Mot de passe</span> — les 3 dernières sont optionnelles.
              </p>

              <div className="rounded-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                    Noms de classes disponibles
                  </p>
                  <button
                    type="button"
                    onClick={() => setMiniClasse(true)}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Créer une classe
                  </button>
                </div>
                {classes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 px-3 py-2">
                    {classes.map((c) => (
                      <span key={c.id} className="font-mono text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded">{c.nom}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400 px-3 py-2">
                    Aucune classe — cliquez "Créer une classe" pour commencer.
                  </p>
                )}
              </div>

              {mutation.error && (
                <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                  {mutation.error?.response?.data?.message ?? "Erreur lors de l'import"}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={onFermer} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Annuler</button>
                <button
                  disabled={!fichier || mutation.isPending}
                  onClick={() => mutation.mutate(fichier)}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {mutation.isPending ? <Spinner size="sm" /> : <Upload className="w-4 h-4" />}
                  Importer
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {miniClasse && (
        <MiniModalCreerClasse
          onCreee={() => setMiniClasse(false)}
          onFermer={() => setMiniClasse(false)}
        />
      )}
    </div>
  );
}

/* ─── Ligne utilisateur ───────────────────────────────────── */

function LigneUtilisateur({ u, classesDisponibles, roleEnEdition, setRoleEnEdition, classeEnEdition, setClasseEnEdition, changerRoleMutation, changerClasseMutation, toggleActifMutation, reactiverMutation, supprimerMutation, onEditer }) {
  const [confirmSuppr, setConfirmSuppr] = useState(false);

  return (
    <tr className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30">
      {/* Identité */}
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{u.prenom[0]}{u.nom[0]}</span>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-slate-100 text-sm leading-tight">{u.prenom} {u.nom}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500">{u.email}</p>
          </div>
        </div>
      </td>

      {/* Rôle */}
      <td className="px-3 py-2.5">
        {u.role === 'ADMIN' ? (
          <div className="flex items-center gap-1" title="Rôle administrateur protégé">
            <RoleBadge role={u.role} />
            <Lock className="w-3 h-3 text-gray-300 dark:text-slate-600" />
          </div>
        ) : roleEnEdition === u.id ? (
          <div className="flex items-center gap-1">
            <select
              defaultValue={u.role}
              onChange={(e) => changerRoleMutation.mutate({ id: u.id, role: e.target.value })}
              className="border border-indigo-300 dark:border-indigo-600 dark:bg-slate-700 dark:text-slate-100 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            >
              {ROLES.filter((r) => r !== 'ADMIN').map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button onClick={() => setRoleEnEdition(null)} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <button onClick={() => setRoleEnEdition(u.id)} className="flex items-center gap-1 group">
            <RoleBadge role={u.role} />
            <ChevronDown className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </td>

      {/* Classe (éditable pour ELEVE) */}
      <td className="px-3 py-2.5">
        {u.role === 'ELEVE' ? (
          classeEnEdition === u.id ? (
            <div className="flex items-center gap-1">
              <select
                defaultValue={u.classe?.classe?.id ?? ''}
                onChange={(e) => changerClasseMutation.mutate({ id: u.id, classeId: e.target.value || null })}
                className="border border-indigo-300 dark:border-indigo-600 dark:bg-slate-700 dark:text-slate-100 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                autoFocus
              >
                <option value="">— Sans classe —</option>
                {classesDisponibles.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              <button onClick={() => setClasseEnEdition(null)} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button
              onClick={() => setClasseEnEdition(u.id)}
              title="Cliquer pour affecter une classe"
              className="flex items-center gap-1 group text-xs"
            >
              {u.classe?.classe?.nom ? (
                <span className="text-gray-700 dark:text-slate-300 font-medium">{u.classe.classe.nom}</span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  Sans classe
                </span>
              )}
              <ChevronDown className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )
        ) : (
          <span className="text-gray-300 dark:text-slate-600 text-xs">—</span>
        )}
      </td>

      {/* Statut */}
      <td className="px-3 py-2.5">
        {u.actif
          ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium"><UserCheck className="w-3.5 h-3.5" /> Actif</span>
          : <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium"><UserX className="w-3.5 h-3.5" /> Désactivé</span>
        }
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5">
        {u.role === 'ADMIN' ? (
          /* Compte admin : seule la modification du profil est permise */
          <div className="flex items-center gap-1">
            <button onClick={() => onEditer(u)} title="Modifier le profil" className="p-1.5 rounded-lg text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <span
              title="Compte administrateur protégé — suppression et désactivation impossibles"
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-700/50 rounded-lg select-none"
            >
              <Shield className="w-3 h-3" /> Protégé
            </span>
          </div>
        ) : confirmSuppr ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Supprimer ?
            </span>
            <button
              onClick={() => { supprimerMutation.mutate(u.id); setConfirmSuppr(false); }}
              className="p-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
              title="Confirmer la suppression"
            >
              <Check className="w-3 h-3" />
            </button>
            <button onClick={() => setConfirmSuppr(false)} className="p-1 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title="Annuler">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button onClick={() => onEditer(u)} title="Modifier le compte" className="p-1.5 rounded-lg text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {u.actif ? (
              <button onClick={() => toggleActifMutation.mutate(u.id)} title="Désactiver le compte" className="p-1.5 rounded-lg text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-500 transition-colors">
                <UserX className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button onClick={() => reactiverMutation.mutate(u.id)} title="Réactiver le compte" className="p-1.5 rounded-lg text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 transition-colors">
                <UserRoundCheck className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={() => setConfirmSuppr(true)} title="Supprimer définitivement" className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

/* ─── Page principale ─────────────────────────────────────── */

export default function Users() {
  const [search, setSearch]           = useState('');
  const [filtreRole, setFiltreRole]   = useState('');
  const [modalCree, setModalCree]         = useState(false);
  const [modalImport, setModalImport]     = useState(false);
  const [utilisateurEdite, setUtilisateurEdite] = useState(null);
  const [roleEnEdition, setRoleEnEdition]       = useState(null);
  const [classeEnEdition, setClasseEnEdition]   = useState(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', filtreRole, search],
    queryFn: () => api.get('/users', { params: { role: filtreRole || undefined, search: search || undefined, limite: 500 } }).then((r) => r.data),
  });

  const { data: classesRaw } = useQuery({
    queryKey: ['classes-liste'],
    queryFn: () => api.get('/classes', { params: { actif: true } }).then((r) => r.data),
  });
  const classesDisponibles = Array.isArray(classesRaw) ? classesRaw : (classesRaw?.classes ?? []);

  const changerRoleMutation = useMutation({
    mutationFn: ({ id, role }) => api.patch(`/users/${id}/role`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      // Un rôle qui quitte ELEVE désinscrit automatiquement l'utilisateur
      // de sa classe côté backend — les caches classes/classe doivent suivre.
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['classe'] });
      setRoleEnEdition(null);
    },
  });

  const changerClasseMutation = useMutation({
    mutationFn: ({ id, classeId }) => api.patch(`/users/${id}/classe`, { classeId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      // La liste des classes (effectifs) et le détail d'une classe (roster)
      // ont leurs propres caches — sans ça, ils restent affichés à
      // l'ancien état tant que la page n'est pas rechargée manuellement.
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['classe'] });
      setClasseEnEdition(null);
    },
  });

  const toggleActifMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const supprimerMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}/permanent`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const utilisateurs = data?.utilisateurs ?? [];
  const total = data?.total ?? 0;

  /* Regroupement par classe */
  const groupes = useMemo(() => {
    const equipe     = { key: '__equipe__', label: 'Équipe pédagogique', users: [] };
    const sansClasse = { key: '__sans__',   label: 'Sans classe',        users: [] };
    const classeMap  = {};

    for (const u of utilisateurs) {
      if (u.role !== 'ELEVE') {
        equipe.users.push(u);
      } else {
        const nom = u.classe?.classe?.nom;
        if (!nom) {
          sansClasse.users.push(u);
        } else {
          if (!classeMap[nom]) classeMap[nom] = { key: nom, label: nom, users: [] };
          classeMap[nom].users.push(u);
        }
      }
    }

    const result = [];
    if (equipe.users.length) result.push(equipe);
    Object.values(classeMap)
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
      .forEach((g) => result.push(g));
    if (sansClasse.users.length) result.push(sansClasse);
    return result;
  }, [utilisateurs]);

  const reactiverMutation = useMutation({
    mutationFn: (id) => api.patch(`/users/${id}/reactiver`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const sharedProps = { classesDisponibles, roleEnEdition, setRoleEnEdition, classeEnEdition, setClasseEnEdition, changerRoleMutation, changerClasseMutation, toggleActifMutation, reactiverMutation, supprimerMutation, onEditer: setUtilisateurEdite };

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-50">Utilisateurs</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{total} compte{total !== 1 ? 's' : ''} au total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModalImport(true)} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">
            <Upload className="w-4 h-4" />
            Importer
          </button>
          <button onClick={() => setModalCree(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" />
            Nouveau compte
          </button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, prénom, email…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filtreRole}
            onChange={(e) => setFiltreRole(e.target.value)}
            className="border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tous les rôles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </Card>

      {/* Corps */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : utilisateurs.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <UsersIcon className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Aucun utilisateur trouvé</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupes.map((groupe) => (
            <div key={groupe.key}>
              {/* En-tête du groupe */}
              <div className="flex items-center gap-2 px-1 mb-2">
                <GraduationCap className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">{groupe.label}</h3>
                <span className="text-xs text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
                  {groupe.users.length}
                </span>
              </div>

              {/* Table du groupe */}
              <Card padding={false}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-700">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Utilisateur</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rôle</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Classe</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                      {groupe.users.map((u) => (
                        <LigneUtilisateur key={u.id} u={u} {...sharedProps} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {modalCree        && <ModalCreerUtilisateur onFermer={() => setModalCree(false)} />}
      {modalImport      && <ModalImportUtilisateurs onFermer={() => setModalImport(false)} />}
      {utilisateurEdite && <ModalModifierUtilisateur utilisateur={utilisateurEdite} onFermer={() => setUtilisateurEdite(null)} />}
    </div>
  );
}
