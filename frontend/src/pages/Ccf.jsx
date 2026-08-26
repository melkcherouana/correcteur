import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { GraduationCap, Plus, ChevronRight, Loader2, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Card from '../components/ui/Card.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';

// ─── Formulaire nouveau CCF ───────────────────────────────────────────────────

function FormCcf({ classes, onFermer, onCree }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    classeId: '', titre: '', description: '', numSituation: 1,
    datePassage: '', noteMax: 20, coefficient: 1, contexte: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => api.post('/ccf', form),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['ccf'] }); onCree(res.data.id); },
  });

  const champ = (label, key, type = 'text', req = false) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}{req && ' *'}</label>
      <input type={type} value={form[key]} onChange={e => set(key, type === 'number' ? Number(e.target.value) : e.target.value)}
        required={req}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Nouveau CCF</h2>
          <button onClick={onFermer}><X className="w-5 h-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="p-6 space-y-4">

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Classe *</label>
            <select value={form.classeId} onChange={e => set('classeId', e.target.value)} required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Choisir…</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>

          {champ('Intitulé *', 'titre', 'text', true)}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Situation</label>
              <select value={form.numSituation} onChange={e => set('numSituation', Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value={1}>S1 — Situation 1</option>
                <option value={2}>S2 — Situation 2</option>
                <option value={3}>S3 — Situation 3</option>
              </select>
            </div>
            {champ('Date prévue', 'datePassage', 'date')}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {champ('Note max', 'noteMax', 'number')}
            {champ('Coefficient', 'coefficient', 'number')}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Contexte professionnel</label>
            <textarea value={form.contexte} onChange={e => set('contexte', e.target.value)}
              rows={3} placeholder="Décrire la situation professionnelle évaluée…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {mutation.error?.response?.data?.message ?? 'Erreur lors de la création'}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onFermer}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
              Annuler
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Créer le CCF
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Carte CCF ────────────────────────────────────────────────────────────────

function CarteCcf({ ccf, onClick }) {
  const pct = ccf.totalEleves > 0 ? Math.round((ccf.notesSaisies / ccf.totalEleves) * 100) : 0;
  const sit = ccf.ccfDetail?.numSituation ?? 1;

  return (
    <button onClick={onClick}
      className="w-full flex items-start justify-between gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:shadow-sm transition-all text-left group">
      <div className="flex items-start gap-4 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-purple-700 dark:text-purple-300">S{sit}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{ccf.titre}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{ccf.classe?.nom}</p>
          {ccf.datePassage && (
            <p className="text-xs text-slate-400 mt-0.5">
              {format(new Date(ccf.datePassage), 'd MMM yyyy', { locale: fr })}
            </p>
          )}
          <div className="mt-2">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Élèves évalués</span>
              <span className="font-medium">{ccf.notesSaisies}/{ccf.totalEleves}</span>
            </div>
            <ProgressBar value={pct} max={100} />
          </div>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 mt-1 flex-shrink-0" />
    </button>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Ccf() {
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const estEnseignant = ['ENSEIGNANT', 'ADMIN'].includes(utilisateur?.role);

  const [classeId, setClasseId]       = useState('');
  const [modalOuvert, setModalOuvert] = useState(false);

  const { data: ccfs = [], isLoading } = useQuery({
    queryKey: ['ccf', classeId],
    queryFn: () => api.get('/ccf', { params: classeId ? { classeId } : {} }).then(r => r.data),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data),
    enabled: estEnseignant,
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-purple-600" /> CCF
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Contrôles en Cours de Formation</p>
        </div>
        {estEnseignant && (
          <button onClick={() => setModalOuvert(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700">
            <Plus className="w-4 h-4" /> Nouveau CCF
          </button>
        )}
      </div>

      {estEnseignant && (
        <Card>
          <div className="flex flex-col gap-1 min-w-[180px] max-w-xs">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Filtrer par classe</label>
            <select value={classeId} onChange={e => setClasseId(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Toutes les classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : ccfs.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun CCF trouvé.</p>
          {estEnseignant && (
            <button onClick={() => setModalOuvert(true)}
              className="mt-3 text-sm text-purple-600 hover:underline">
              Créer le premier CCF
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {ccfs.map(c => (
            <CarteCcf key={c.id} ccf={c} onClick={() => navigate(`/ccf/${c.id}`)} />
          ))}
        </div>
      )}

      {modalOuvert && (
        <FormCcf
          classes={classes}
          onFermer={() => setModalOuvert(false)}
          onCree={(id) => { setModalOuvert(false); navigate(`/ccf/${id}`); }}
        />
      )}
    </div>
  );
}
