import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookMarked, Plus, ChevronRight, GripVertical, ArrowUp, ArrowDown, X, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import Spinner from '../components/ui/Spinner.jsx';

// ─── Formulaire création ──────────────────────────────────────────────────────

function FormSequence({ matieres, onFermer, onCree }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ matiereId: '', titre: '', description: '', objectifs: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => api.post('/sequences', form),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['sequences'] }); onCree(res.data.id); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Nouvelle séquence</h2>
          <button onClick={onFermer}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Matière *</label>
            <select value={form.matiereId} onChange={e => set('matiereId', e.target.value)} required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Choisir une matière…</option>
              {matieres.map(m => <option key={m.id} value={m.id}>[{m.code}] {m.nom}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Titre *</label>
            <input value={form.titre} onChange={e => set('titre', e.target.value)} required
              placeholder="ex : Séquence 3 — Automatismes industriels"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} placeholder="Résumé de la séquence…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Objectifs pédagogiques</label>
            <textarea value={form.objectifs} onChange={e => set('objectifs', e.target.value)}
              rows={3} placeholder="À la fin de cette séquence, l'élève sera capable de…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-600">{mutation.error?.response?.data?.message ?? 'Erreur'}</p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onFermer}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
              Annuler
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Groupe séquences par matière ─────────────────────────────────────────────

function GroupeMatiere({ matiere, sequences, onNaviguer, onDeplacer }) {
  return (
    <div>
      {/* En-tête matière */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="font-mono text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
          {matiere.code}
        </span>
        <h2 className="text-sm font-semibold text-slate-700">{matiere.nom}</h2>
        <span className="text-xs text-slate-400 ml-auto">{sequences.length} séquence{sequences.length > 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-1.5">
        {sequences.map((seq, idx) => (
          <div key={seq.id}
            className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 hover:border-indigo-200 transition-all group">

            {/* Flèches de réordonnement */}
            <div className="flex flex-col pl-2 py-1 gap-0.5 flex-shrink-0">
              <button
                disabled={idx === 0}
                onClick={() => onDeplacer(seq, 'haut', sequences)}
                className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed text-slate-400">
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                disabled={idx === sequences.length - 1}
                onClick={() => onDeplacer(seq, 'bas', sequences)}
                className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed text-slate-400">
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>

            {/* Contenu */}
            <button onClick={() => onNaviguer(seq.id)}
              className="flex-1 flex items-center gap-3 py-3 pr-4 text-left min-w-0">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500 text-xs font-bold">
                {seq.ordre}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800 truncate">{seq.titre}</p>
                {seq.description && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">{seq.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-slate-400">
                  {seq._count.evaluations} éval{seq._count.evaluations > 1 ? 's' : ''}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Sequences() {
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const qc = useQueryClient();
  const estEnseignant = ['ENSEIGNANT', 'ADMIN'].includes(utilisateur?.role);

  const [matiereId, setMatiereId]     = useState('');
  const [modalOuvert, setModalOuvert] = useState(false);

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['sequences', matiereId],
    queryFn: () => api.get('/sequences', { params: matiereId ? { matiereId } : {} }).then(r => r.data),
  });

  const { data: matieres = [] } = useQuery({
    queryKey: ['matieres'],
    queryFn: () => api.get('/matieres').then(r => r.data),
  });

  const mutReordonner = useMutation({
    mutationFn: (items) => api.post('/sequences/reordonner', { items }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sequences'] }),
  });

  // Grouper par matière
  const parMatiere = sequences.reduce((acc, seq) => {
    const key = seq.matiereId;
    if (!acc[key]) acc[key] = { matiere: seq.matiere, sequences: [] };
    acc[key].sequences.push(seq);
    return acc;
  }, {});

  const deplacer = (seq, direction, groupe) => {
    const idx = groupe.findIndex(s => s.id === seq.id);
    const autreIdx = direction === 'haut' ? idx - 1 : idx + 1;
    if (autreIdx < 0 || autreIdx >= groupe.length) return;

    const ordreA = groupe[idx].ordre;
    const ordreB = groupe[autreIdx].ordre;

    mutReordonner.mutate([
      { id: groupe[idx].id,   ordre: ordreB },
      { id: groupe[autreIdx].id, ordre: ordreA },
    ]);
  };

  const sequencesFiltrees = matiereId
    ? sequences.filter(s => s.matiereId === matiereId)
    : sequences;

  const groupesFiltres = sequencesFiltrees.reduce((acc, seq) => {
    const key = seq.matiereId;
    if (!acc[key]) acc[key] = { matiere: seq.matiere, sequences: [] };
    acc[key].sequences.push(seq);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-indigo-600" />
            Séquences pédagogiques
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Organisez vos cours par unités pédagogiques liées aux évaluations
          </p>
        </div>
        {estEnseignant && (
          <button onClick={() => setModalOuvert(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> Nouvelle séquence
          </button>
        )}
      </div>

      {/* Filtre matière */}
      <Card>
        <div className="flex flex-col gap-1 max-w-xs">
          <label className="text-xs font-medium text-slate-600">Filtrer par matière</label>
          <select value={matiereId} onChange={e => setMatiereId(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Toutes les matières</option>
            {matieres.map(m => (
              <option key={m.id} value={m.id}>[{m.code}] {m.nom}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Liste */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : Object.keys(groupesFiltres).length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune séquence.</p>
          {estEnseignant && (
            <button onClick={() => setModalOuvert(true)}
              className="mt-3 text-sm text-indigo-600 hover:underline">
              Créer la première séquence
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.values(groupesFiltres).map(({ matiere, sequences: seqs }) => (
            <GroupeMatiere
              key={matiere.id}
              matiere={matiere}
              sequences={seqs}
              onNaviguer={id => navigate(`/sequences/${id}`)}
              onDeplacer={deplacer}
            />
          ))}
        </div>
      )}

      {modalOuvert && (
        <FormSequence
          matieres={matieres}
          onFermer={() => setModalOuvert(false)}
          onCree={(id) => { setModalOuvert(false); navigate(`/sequences/${id}`); }}
        />
      )}
    </div>
  );
}
