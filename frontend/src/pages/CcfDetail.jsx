import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ChevronLeft, GraduationCap, Calendar, CheckCircle2,
  Pencil, Save, Loader2, AlertCircle, Target,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import Badge from '../components/ui/Badge.jsx';

const PALIERS = { 1: 'Novice', 2: 'Débrouillé', 3: 'Averti', 4: 'Expert' };
const PALIER_COULEUR = {
  1: 'bg-red-100 text-red-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-yellow-100 text-yellow-800',
  4: 'bg-green-100 text-green-700',
};

// ─── Cellule de saisie de note inline ─────────────────────────────────────────

function CelluleNote({ eleveId, evaluationId, noteInitiale, commentaireInitial, lectureSeule, onSaved }) {
  const [valeur, setValeur]     = useState(noteInitiale ?? '');
  const [comment, setComment]   = useState(commentaireInitial ?? '');
  const [modifie, setModifie]   = useState(false);

  const mutation = useMutation({
    mutationFn: () => api.post(`/ccf/${evaluationId}/noter`, {
      eleveId,
      valeur: valeur !== '' ? Number(valeur) : null,
      commentaire: comment || null,
    }),
    onSuccess: () => { setModifie(false); onSaved?.(); },
  });

  if (lectureSeule) {
    return valeur !== '' && valeur !== null
      ? <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PALIER_COULEUR[valeur] ?? 'bg-gray-100 text-gray-600'}`}>
          {PALIERS[valeur] ?? valeur}
        </span>
      : <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={valeur}
        onChange={e => { setValeur(e.target.value); setModifie(true); }}
        className="text-xs border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="">—</option>
        {[1, 2, 3, 4].map(p => <option key={p} value={p}>{p} — {PALIERS[p]}</option>)}
      </select>
      {modifie && (
        <button onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {mutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function CcfDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const qc = useQueryClient();
  const estEnseignant = ['ENSEIGNANT', 'ADMIN'].includes(utilisateur?.role);

  const [modeEdit, setModeEdit]   = useState(false);
  const [editForm, setEditForm]   = useState({});
  const [erreur, setErreur]       = useState('');

  const { data: ccf, isLoading } = useQuery({
    queryKey: ['ccf', id],
    queryFn: () => api.get(`/ccf/${id}`).then(r => r.data),
    onSuccess: (d) => setEditForm({
      contexte: d.ccfDetail?.contexte ?? '',
      dateJury: d.ccfDetail?.dateJury ? d.ccfDetail.dateJury.slice(0, 10) : '',
      observations: d.ccfDetail?.observations ?? '',
    }),
  });

  const { data: completion } = useQuery({
    queryKey: ['ccf-completion', id],
    queryFn: () => api.get(`/ccf/${id}/completion`).then(r => r.data),
    enabled: !!id,
  });

  const mutModifier = useMutation({
    mutationFn: () => api.put(`/ccf/${id}`, {
      contexte: editForm.contexte,
      dateJury: editForm.dateJury || null,
      observations: editForm.observations,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ccf', id] }); setModeEdit(false); setErreur(''); },
    onError: (e) => setErreur(e.response?.data?.message ?? 'Erreur'),
  });

  const mutStatut = useMutation({
    mutationFn: (statut) => api.put(`/ccf/${id}`, { statut }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ccf', id] }),
  });

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (!ccf) return (
    <div className="text-center py-16 text-slate-400">
      <p>CCF introuvable.</p>
      <button onClick={() => navigate('/ccf')} className="mt-2 text-purple-600 text-sm hover:underline">Retour</button>
    </div>
  );

  const detail  = ccf.ccfDetail;
  const eleves  = ccf.classe?.eleves?.map(e => e.eleve) ?? [];
  const notesMap = Object.fromEntries((ccf.notes ?? []).map(n => [n.eleveId, n]));

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <button onClick={() => navigate('/ccf')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ChevronLeft className="w-4 h-4" /> Tous les CCF
      </button>

      {/* En-tête */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-black text-purple-700">S{detail?.numSituation ?? 1}</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 truncate">{ccf.titre}</h1>
              <p className="text-slate-500 text-sm">{ccf.classe?.nom}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge value={ccf.statut} />
                {ccf.datePassage && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(ccf.datePassage), 'd MMM yyyy', { locale: fr })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {estEnseignant && (
            <div className="flex gap-2 flex-shrink-0">
              {ccf.statut !== 'CORRIGEE' && ccf.statut !== 'ARCHIVEE' && (
                <button onClick={() => mutStatut.mutate('CORRIGEE')}
                  disabled={mutStatut.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {mutStatut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Clore
                </button>
              )}
              {!modeEdit ? (
                <button onClick={() => setModeEdit(true)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50">
                  <Pencil className="w-4 h-4" /> Modifier
                </button>
              ) : (
                <button onClick={() => mutModifier.mutate()}
                  disabled={mutModifier.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {mutModifier.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer
                </button>
              )}
            </div>
          )}
        </div>

        {completion && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500">Élèves évalués</span>
              <span className="text-xs font-bold text-purple-700">
                {completion.notesSaisies}/{completion.totalEleves}
              </span>
            </div>
            <ProgressBar value={completion.pourcentage} max={100} />
          </div>
        )}
      </div>

      {erreur && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4" /> {erreur}
        </div>
      )}

      {/* Infos CCF */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Contexte professionnel" />
          {modeEdit ? (
            <textarea value={editForm.contexte ?? ''}
              onChange={e => setEditForm(f => ({ ...f, contexte: e.target.value }))}
              rows={5} placeholder="Décrivez la situation professionnelle…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          ) : detail?.contexte ? (
            <p className="text-sm text-slate-700 leading-relaxed">{detail.contexte}</p>
          ) : (
            <p className="text-sm text-slate-400">Non renseigné</p>
          )}
        </Card>

        <Card>
          <CardHeader title="Jury & observations" />
          {modeEdit ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Date du jury</label>
                <input type="date" value={editForm.dateJury ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, dateJury: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Observations</label>
                <textarea value={editForm.observations ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, observations: e.target.value }))}
                  rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {detail?.dateJury ? (
                <div>
                  <p className="text-xs text-slate-500">Date du jury</p>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">
                    {format(new Date(detail.dateJury), 'd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              ) : <p className="text-xs text-slate-400">Pas de date de jury</p>}
              {detail?.observations && (
                <p className="text-sm text-slate-700 italic">"{detail.observations}"</p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Compétences ciblées */}
      {detail?.competencesCiblees?.length > 0 && (
        <Card>
          <CardHeader title="Compétences ciblées" />
          <div className="flex flex-wrap gap-2">
            {detail.competencesCiblees.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
                <Target className="w-3.5 h-3.5 text-purple-600" />
                <span className="font-mono text-xs font-bold text-purple-700">{c.code}</span>
                <span className="text-xs text-slate-600">{c.description}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Grille de notation */}
      <Card padding={false}>
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Grille de notation</h2>
          <p className="text-xs text-slate-500 mt-0.5">Note max : {ccf.noteMax}/4 · Coefficient : {ccf.coefficient}</p>
        </div>

        {eleves.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-400 text-center">Aucun élève dans cette classe.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Élève</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Palier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Commentaire</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {eleves.map(eleve => {
                const note = notesMap[eleve.id];
                return (
                  <tr key={eleve.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-slate-600">
                            {eleve.prenom[0]}{eleve.nom[0]}
                          </span>
                        </div>
                        <span className="font-medium text-slate-800">{eleve.nom} {eleve.prenom}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CelluleNote
                        eleveId={eleve.id}
                        evaluationId={id}
                        noteInitiale={note?.valeur ?? ''}
                        commentaireInitial={note?.commentaire ?? ''}
                        lectureSeule={!estEnseignant || ccf.statut === 'ARCHIVEE'}
                        onSaved={() => qc.invalidateQueries({ queryKey: ['ccf', id] })}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {note?.commentaire ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
