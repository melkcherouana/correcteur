import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Building2, Plus, ChevronRight, Calendar, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import Spinner from '../components/ui/Spinner.jsx';

const STATUT_STYLE = {
  PLANIFIEE: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  EN_COURS:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  TERMINEE:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  VALIDEE:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};
const STATUT_LABEL = {
  PLANIFIEE: 'Planifiée', EN_COURS: 'En cours', TERMINEE: 'Terminée', VALIDEE: 'Validée',
};

// ─── Formulaire nouvelle PFMP ─────────────────────────────────────────────────

function FormPfmp({ classes, onFermer, onCree }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    classeId: '', eleveId: '', numero: 1, semaines: 6,
    dateDebut: '', dateFin: '',
    entrepriseNom: '', entrepriseAdresse: '', entrepriseSecteur: '',
    tuteurNom: '', tuteurEmail: '', tuteurTelephone: '',
  });

  const { data: classeDetail } = useQuery({
    queryKey: ['classe-eleves', form.classeId],
    queryFn: () => api.get(`/classes/${form.classeId}`).then(r => r.data),
    enabled: !!form.classeId,
  });
  const eleves = classeDetail?.eleves?.map(e => e.eleve) ?? [];

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => api.post('/pfmps', form),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['pfmps'] });
      onCree(res.data.id);
    },
  });

  const champ = (label, key, type = 'text', required = false) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}{required && ' *'}</label>
      <input
        type={type} value={form[key]}
        onChange={e => set(key, e.target.value)}
        required={required}
        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Nouvelle PFMP</h2>
          <button onClick={onFermer}><X className="w-5 h-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="p-6 space-y-6">

          {/* Élève */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Élève</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Classe *</label>
                <select value={form.classeId} onChange={e => set('classeId', e.target.value)} required
                  className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Choisir…</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Élève *</label>
                <select value={form.eleveId} onChange={e => set('eleveId', e.target.value)} required
                  disabled={!form.classeId}
                  className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 dark:disabled:bg-slate-800">
                  <option value="">Choisir…</option>
                  {eleves.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Période */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Période</h3>
            <div className="grid grid-cols-3 gap-3">
              {champ('N° PFMP', 'numero', 'number')}
              {champ('Date début *', 'dateDebut', 'date', true)}
              {champ('Date fin *', 'dateFin', 'date', true)}
            </div>
            {champ('Durée (semaines)', 'semaines', 'number')}
          </section>

          {/* Entreprise */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Entreprise</h3>
            {champ('Nom de l\'entreprise *', 'entrepriseNom', 'text', true)}
            <div className="grid grid-cols-2 gap-3">
              {champ('Secteur d\'activité', 'entrepriseSecteur')}
              {champ('Adresse', 'entrepriseAdresse')}
            </div>
          </section>

          {/* Tuteur */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Maître de stage</h3>
            <div className="grid grid-cols-3 gap-3">
              {champ('Nom du tuteur', 'tuteurNom')}
              {champ('Email', 'tuteurEmail', 'email')}
              {champ('Téléphone', 'tuteurTelephone')}
            </div>
          </section>

          {mutation.isError && (
            <p className="text-sm text-red-600">{mutation.error?.response?.data?.message ?? 'Erreur lors de la création'}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onFermer} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">Annuler</button>
            <button type="submit" disabled={mutation.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Créer la PFMP
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Carte PFMP ───────────────────────────────────────────────────────────────

function CartePfmp({ pfmp, onClick }) {
  const duree = pfmp.dateFin && pfmp.dateDebut
    ? Math.round((new Date(pfmp.dateFin) - new Date(pfmp.dateDebut)) / (1000 * 60 * 60 * 24 * 7))
    : null;

  return (
    <button onClick={onClick}
      className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:shadow-sm transition-all text-left group">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{pfmp.entrepriseNom}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
            PFMP {pfmp.numero} — {pfmp.eleve.nom} {pfmp.eleve.prenom}
            {pfmp.classe && ` · ${pfmp.classe.nom}`}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">
              {format(new Date(pfmp.dateDebut), 'd MMM', { locale: fr })} →{' '}
              {format(new Date(pfmp.dateFin), 'd MMM yyyy', { locale: fr })}
              {duree !== null && ` (${duree} sem.)`}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUT_STYLE[pfmp.statut]}`}>
          {STATUT_LABEL[pfmp.statut]}
        </span>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
      </div>
    </button>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Pfmp() {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();
  const estEleve = utilisateur?.role === 'ELEVE';
  const estEnseignant = ['ENSEIGNANT', 'ADMIN'].includes(utilisateur?.role);

  const [classeId, setClasseId] = useState('');
  const [statut, setStatut]     = useState('');
  const [modalOuvert, setModalOuvert] = useState(false);

  const params = {
    ...(estEleve  && { eleveId: utilisateur.id }),
    ...(classeId  && { classeId }),
    ...(statut    && { statut }),
  };

  const { data: pfmps = [], isLoading } = useQuery({
    queryKey: ['pfmps', params],
    queryFn: () => api.get('/pfmps', { params }).then(r => r.data),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data),
    enabled: estEnseignant,
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> PFMP
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Périodes de Formation en Milieu Professionnel</p>
        </div>
        {estEnseignant && (
          <button onClick={() => setModalOuvert(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> Nouvelle PFMP
          </button>
        )}
      </div>

      {/* Filtres enseignant */}
      {estEnseignant && (
        <Card>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1 min-w-[180px]">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Classe</label>
              <select value={classeId} onChange={e => setClasseId(e.target.value)}
                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Toutes les classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1 min-w-[160px]">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Statut</label>
              <select value={statut} onChange={e => setStatut(e.target.value)}
                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Tous les statuts</option>
                {Object.entries(STATUT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : pfmps.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune PFMP trouvée.</p>
          {estEnseignant && (
            <button onClick={() => setModalOuvert(true)}
              className="mt-3 text-sm text-indigo-600 hover:underline">
              Créer la première PFMP
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {pfmps.map(p => (
            <CartePfmp key={p.id} pfmp={p} onClick={() => navigate(`/pfmps/${p.id}`)} />
          ))}
        </div>
      )}

      {/* Modal création */}
      {modalOuvert && (
        <FormPfmp
          classes={classes}
          onFermer={() => setModalOuvert(false)}
          onCree={(id) => { setModalOuvert(false); navigate(`/pfmps/${id}`); }}
        />
      )}
    </div>
  );
}
