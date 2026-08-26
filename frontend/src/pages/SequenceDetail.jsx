import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ChevronLeft, BookMarked, Target, ClipboardList,
  Pencil, Save, Loader2, Plus, ChevronRight, Trash2, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import Badge from '../components/ui/Badge.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';

const TYPE_LABELS = {
  DEVOIR_SURVEILLE: 'DS', TRAVAUX_PRATIQUES: 'TP',
  ORAL: 'Oral', PROJET: 'Projet', CCF: 'CCF',
};

const NIV_COULEUR = {
  NON_ACQUIS: 'bg-red-100 text-red-700',
  EN_COURS:   'bg-yellow-100 text-yellow-700',
  ACQUIS:     'bg-green-100 text-green-700',
  DEPASSE:    'bg-indigo-100 text-indigo-700',
};
const NIV_LABEL = { NON_ACQUIS: 'Non acquis', EN_COURS: 'En cours', ACQUIS: 'Acquis', DEPASSE: 'Dépassé' };

// ─── Champ éditable simple ────────────────────────────────────────────────────

function ChampEditable({ label, valeur, onChange, multiline = false, placeholder = '' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {multiline ? (
        <textarea value={valeur} onChange={e => onChange(e.target.value)}
          rows={4} placeholder={placeholder}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      ) : (
        <input value={valeur} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function SequenceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const qc = useQueryClient();
  const estEnseignant = ['ENSEIGNANT', 'ADMIN'].includes(utilisateur?.role);

  const [modeEdit, setModeEdit]   = useState(false);
  const [editForm, setEditForm]   = useState({});
  const [erreur, setErreur]       = useState('');
  const [confirmerSuppr, setConfirmerSuppr] = useState(false);

  const { data: seq, isLoading } = useQuery({
    queryKey: ['sequence', id],
    queryFn: () => api.get(`/sequences/${id}`).then(r => r.data),
    onSuccess: (d) => setEditForm({
      titre:       d.titre,
      description: d.description ?? '',
      objectifs:   d.objectifs   ?? '',
      ordre:       d.ordre,
    }),
  });

  const mutModifier = useMutation({
    mutationFn: () => api.put(`/sequences/${id}`, editForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sequence', id] }); setModeEdit(false); setErreur(''); },
    onError: e => setErreur(e.response?.data?.message ?? 'Erreur'),
  });

  const mutSupprimer = useMutation({
    mutationFn: () => api.delete(`/sequences/${id}`),
    onSuccess: () => navigate('/sequences'),
    onError: e => setErreur(e.response?.data?.message ?? 'Erreur'),
  });

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (!seq) return (
    <div className="text-center py-16 text-slate-400">
      <p>Séquence introuvable.</p>
      <button onClick={() => navigate('/sequences')} className="mt-2 text-indigo-600 text-sm hover:underline">Retour</button>
    </div>
  );

  const set = (k, v) => setEditForm(f => ({ ...f, [k]: v }));

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Navigation */}
      <button onClick={() => navigate('/sequences')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ChevronLeft className="w-4 h-4" /> Toutes les séquences
      </button>

      {/* En-tête */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-black text-indigo-700">#{seq.ordre}</span>
            </div>
            <div className="min-w-0">
              {modeEdit ? (
                <input value={editForm.titre} onChange={e => set('titre', e.target.value)}
                  className="text-xl font-bold border-b-2 border-indigo-400 bg-transparent focus:outline-none w-full" />
              ) : (
                <h1 className="text-xl font-bold text-slate-900 leading-tight">{seq.titre}</h1>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                  {seq.matiere.code}
                </span>
                <span className="text-sm text-slate-500">{seq.matiere.nom}</span>
              </div>
            </div>
          </div>

          {estEnseignant && (
            <div className="flex gap-2 flex-shrink-0">
              {!modeEdit ? (
                <>
                  <button onClick={() => setModeEdit(true)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50">
                    <Pencil className="w-4 h-4" /> Modifier
                  </button>
                  <button onClick={() => setConfirmerSuppr(true)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => { setModeEdit(false); setEditForm({ titre: seq.titre, description: seq.description ?? '', objectifs: seq.objectifs ?? '', ordre: seq.ordre }); }}
                    className="px-3 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50">
                    Annuler
                  </button>
                  <button onClick={() => mutModifier.mutate()}
                    disabled={mutModifier.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {mutModifier.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Enregistrer
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{seq.stats.totalEvaluations}</p>
            <p className="text-xs text-slate-400 mt-0.5">évaluation{seq.stats.totalEvaluations !== 1 ? 's' : ''}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-600">{seq.stats.notesSaisies}</p>
            <p className="text-xs text-slate-400 mt-0.5">notes saisies</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{seq.stats.tauxCompletion}%</p>
            <p className="text-xs text-slate-400 mt-0.5">complétion</p>
          </div>
        </div>

        {seq.stats.totalPossible > 0 && (
          <div className="mt-3">
            <ProgressBar value={seq.stats.tauxCompletion} max={100} />
          </div>
        )}
      </div>

      {/* Confirmation suppression */}
      {confirmerSuppr && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-red-700">
            <strong>Supprimer cette séquence ?</strong>
            {seq.stats.totalEvaluations > 0 && ` (impossible : ${seq.stats.totalEvaluations} évaluation(s) liée(s))`}
          </p>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setConfirmerSuppr(false)}
              className="px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-white">
              Annuler
            </button>
            <button onClick={() => mutSupprimer.mutate()}
              disabled={mutSupprimer.isPending || seq.stats.totalEvaluations > 0}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40">
              Supprimer
            </button>
          </div>
        </div>
      )}

      {erreur && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4" /> {erreur}
        </div>
      )}

      {/* Description et objectifs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Description" />
          {modeEdit ? (
            <ChampEditable label="" valeur={editForm.description} onChange={v => set('description', v)}
              multiline placeholder="Contexte et présentation de la séquence…" />
          ) : seq.description ? (
            <p className="text-sm text-slate-700 leading-relaxed">{seq.description}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">Non renseignée</p>
          )}
        </Card>

        <Card>
          <CardHeader title="Objectifs pédagogiques" />
          {modeEdit ? (
            <ChampEditable label="" valeur={editForm.objectifs} onChange={v => set('objectifs', v)}
              multiline placeholder="À la fin de cette séquence, l'élève sera capable de…" />
          ) : seq.objectifs ? (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{seq.objectifs}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">Non renseignés</p>
          )}
        </Card>
      </div>

      {/* Évaluations de la séquence */}
      <Card padding={false}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">Évaluations</h2>
            <span className="text-xs text-slate-400 font-medium">{seq.evaluations.length}</span>
          </div>
          {estEnseignant && (
            <button
              onClick={() => navigate('/evaluations', { state: { sequenceId: id, classeId: seq.evaluations[0]?.classeId } })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-100">
              <Plus className="w-3.5 h-3.5" /> Ajouter une évaluation
            </button>
          )}
        </div>

        {seq.evaluations.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucune évaluation dans cette séquence.</p>
            {estEnseignant && (
              <button
                onClick={() => navigate('/evaluations', { state: { sequenceId: id } })}
                className="mt-2 text-sm text-indigo-600 hover:underline">
                Créer la première évaluation
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Titre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Classe</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Notes</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Date</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {seq.evaluations.map(ev => (
                <tr key={ev.id}
                  onClick={() => navigate(`/evaluations/${ev.id}`)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors group">
                  <td className="px-6 py-3 font-medium text-slate-800 truncate max-w-[200px]">{ev.titre}</td>
                  <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{ev.classe?.nom ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{TYPE_LABELS[ev.type] ?? ev.type}</td>
                  <td className="px-4 py-3"><Badge value={ev.statut} /></td>
                  <td className="px-4 py-3 text-right text-slate-500 hidden lg:table-cell">{ev._count.notes}</td>
                  <td className="px-4 py-3 text-right text-xs text-slate-400 hidden lg:table-cell">
                    {ev.datePassage ? format(new Date(ev.datePassage), 'd MMM yyyy', { locale: fr }) : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Compétences de la matière */}
      {seq.matiere.competences?.length > 0 && (
        <Card>
          <CardHeader
            title="Compétences de la matière"
            subtitle={`${seq.matiere.competences.length} compétences au référentiel`}
          />
          <div className="space-y-1.5">
            {seq.matiere.competences.map(comp => (
              <div key={comp.id}
                className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <Target className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                <span className="font-mono text-xs text-indigo-600 font-bold flex-shrink-0 mt-0.5 min-w-16">{comp.code}</span>
                <p className="text-sm text-slate-700">{comp.description}</p>
                {comp.criteres.length > 0 && (
                  <span className="text-xs text-slate-400 flex-shrink-0">{comp.criteres.length} critère{comp.criteres.length > 1 ? 's' : ''}</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
