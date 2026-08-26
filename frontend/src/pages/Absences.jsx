import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  CalendarDays, AlertTriangle, CheckCircle2, Clock, Download,
  ChevronDown, ChevronUp, UserCheck, UserX, Loader2, Save, Pencil,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';

// ─── Constantes ───────────────────────────────────────────────────────────────

const TYPE_STYLE = {
  ABSENCE:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  RETARD:    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  EXCLUSION: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};
const TYPE_LABEL = { ABSENCE: 'Absence', RETARD: 'Retard', EXCLUSION: 'Exclusion' };
const MOIS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const formatMois = (str) => { const [, m] = str.split('-'); return MOIS_FR[parseInt(m,10)-1] ?? str; };

// ─── Onglet SAISIE ─────────────────────────────────────────────────────────────

function OngletSaisie({ classes }) {
  const qc = useQueryClient();
  const [classeId, setClasseId] = useState('');
  const [date, setDate]         = useState(new Date().toISOString().slice(0,10));
  const [lignes, setLignes]     = useState({});  // { eleveId: { absent, type, heureDebut, heureFin, dureeHeures, motif } }

  const { data: membres = [], isLoading: chargeMembres } = useQuery({
    queryKey: ['eleves-saisie', classeId],
    queryFn: () => api.get(`/absences/eleves/${classeId}`).then(r => r.data),
    enabled: !!classeId,
    onSuccess: () => setLignes({}),
  });

  const toggleAbsent = (eleveId) => {
    setLignes(prev => {
      const existant = prev[eleveId];
      if (existant?.absent) {
        const { [eleveId]: _, ...reste } = prev;
        return reste;
      }
      return { ...prev, [eleveId]: { absent: true, type: 'ABSENCE', dureeHeures: 1, heureDebut: '08:00', heureFin: '10:00', motif: '' } };
    });
  };

  const setLigne = (eleveId, champ, valeur) =>
    setLignes(prev => ({ ...prev, [eleveId]: { ...prev[eleveId], [champ]: valeur } }));

  const mutation = useMutation({
    mutationFn: () => {
      const absences = Object.entries(lignes)
        .filter(([, l]) => l.absent)
        .map(([eleveId, l]) => ({ eleveId, date, type: l.type, heureDebut: l.heureDebut, heureFin: l.heureFin, dureeHeures: Number(l.dureeHeures), motif: l.motif }));
      return api.post('/absences/bulk', { absences });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['absences'] }); setLignes({}); },
  });

  const nbAbsents = Object.values(lignes).filter(l => l.absent).length;

  return (
    <div className="space-y-5">
      {/* Sélecteurs */}
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1 min-w-[180px]">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Classe</label>
          <select value={classeId} onChange={e => setClasseId(e.target.value)}
            className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Choisir une classe…</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      {classeId && (
        <>
          {chargeMembres ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <>
              {/* Résumé */}
              <div className="flex items-center justify-between px-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-bold text-slate-900 dark:text-slate-50">{membres.length}</span> élèves ·{' '}
                  <span className="font-bold text-red-600 dark:text-red-400">{nbAbsents}</span> absent{nbAbsents > 1 ? 's' : ''} sélectionné{nbAbsents > 1 ? 's' : ''}
                </p>
                <button
                  onClick={() => mutation.mutate()}
                  disabled={nbAbsents === 0 || mutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40">
                  {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer {nbAbsents > 0 ? `(${nbAbsents})` : ''}
                </button>
              </div>

              {mutation.isSuccess && (
                <p className="text-sm text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-900/30 px-4 py-2 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Absences enregistrées.
                </p>
              )}

              {/* Liste des élèves */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-10">✓</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Élève</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Type</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Heures</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">De → À</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Motif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {membres.map(({ eleve }) => {
                      const l = lignes[eleve.id];
                      const absent = l?.absent ?? false;
                      return (
                        <tr key={eleve.id}
                          className={`transition-colors ${absent ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                          <td className="px-4 py-2.5">
                            <button onClick={() => toggleAbsent(eleve.id)}
                              className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors
                                ${absent ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-red-400'}`}>
                              {absent && <UserX className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                          <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">
                            {eleve.nom} {eleve.prenom}
                          </td>
                          <td className="px-4 py-2.5">
                            {absent && (
                              <select value={l.type} onChange={e => setLigne(eleve.id, 'type', e.target.value)}
                                className="text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                                {Object.entries(TYPE_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {absent && (
                              <input type="number" step="0.5" min="0.5" max="8" value={l.dureeHeures}
                                onChange={e => setLigne(eleve.id, 'dureeHeures', e.target.value)}
                                className="w-16 text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {absent && (
                              <div className="flex items-center gap-1">
                                <input type="time" value={l.heureDebut}
                                  onChange={e => setLigne(eleve.id, 'heureDebut', e.target.value)}
                                  className="text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded px-2 py-1 w-20 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                                <span className="text-slate-400 text-xs">→</span>
                                <input type="time" value={l.heureFin}
                                  onChange={e => setLigne(eleve.id, 'heureFin', e.target.value)}
                                  className="text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded px-2 py-1 w-20 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {absent && (
                              <input type="text" value={l.motif} placeholder="Motif…"
                                onChange={e => setLigne(eleve.id, 'motif', e.target.value)}
                                className="text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded px-2 py-1 w-full max-w-[180px] focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
      {!classeId && (
        <div className="text-center py-12 text-slate-400">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sélectionnez une classe pour saisir les absences</p>
        </div>
      )}
    </div>
  );
}

// ─── Onglet LISTE ──────────────────────────────────────────────────────────────

function LigneAbsence({ absence, onJustifier, estEnseignant }) {
  const [ouvert, setOuvert] = useState(false);
  const [justificatif, setJustificatif] = useState(absence.justificatif ?? '');

  return (
    <>
      <tr className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-pointer ${absence.justifiee ? '' : 'border-l-2 border-l-red-400'}`}
        onClick={() => estEnseignant && setOuvert(v => !v)}>
        <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-300">
          {format(new Date(absence.date), 'd MMM yyyy', { locale: fr })}
        </td>
        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
          {absence.eleve.nom} {absence.eleve.prenom}
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[absence.type]}`}>
            {TYPE_LABEL[absence.type]}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 tabular-nums">
          {absence.dureeHeures}h
          {absence.heureDebut && <span className="text-xs text-slate-400 ml-1">({absence.heureDebut}–{absence.heureFin})</span>}
        </td>
        <td className="px-4 py-3">
          {absence.justifiee
            ? <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Justifiée</span>
            : <span className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 font-medium"><AlertTriangle className="w-3.5 h-3.5" /> Non justifiée</span>}
        </td>
        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 max-w-[180px] truncate">{absence.motif ?? '—'}</td>
        {estEnseignant && (
          <td className="px-3 py-3">
            {ouvert ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
          </td>
        )}
      </tr>
      {ouvert && estEnseignant && (
        <tr className="bg-slate-50 dark:bg-slate-800">
          <td colSpan={7} className="px-5 py-3">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Justificatif</label>
                <input value={justificatif} onChange={e => setJustificatif(e.target.value)}
                  placeholder="Motif médical, familial…"
                  className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex gap-2">
                {!absence.justifiee && (
                  <button onClick={() => { onJustifier(absence.id, true, justificatif); setOuvert(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Justifier
                  </button>
                )}
                {absence.justifiee && (
                  <button onClick={() => { onJustifier(absence.id, false, ''); setOuvert(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-500 text-white text-xs font-medium rounded-lg hover:bg-slate-600">
                    Annuler justification
                  </button>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function OngletListe({ classes, eleveIdFixe }) {
  const qc = useQueryClient();
  const { utilisateur } = useAuth();
  const estEnseignant = ['ENSEIGNANT', 'ADMIN'].includes(utilisateur?.role);

  const [classeId,  setClasseId]  = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin,   setDateFin]   = useState('');
  const [type,      setType]      = useState('');
  const [justifiee, setJustifiee] = useState('');

  const params = {
    ...(eleveIdFixe && { eleveId: eleveIdFixe }),
    ...(classeId    && { classeId }),
    ...(dateDebut   && { dateDebut }),
    ...(dateFin     && { dateFin }),
    ...(type        && { type }),
    ...(justifiee   && { justifiee }),
  };

  const { data: absences = [], isLoading } = useQuery({
    queryKey: ['absences', params],
    queryFn: () => api.get('/absences', { params }).then(r => r.data),
  });

  const mutJustifier = useMutation({
    mutationFn: ({ id, justifiee: j, justificatif }) =>
      api.put(`/absences/${id}`, { justifiee: j, justificatif }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['absences'] }),
  });

  const exporter = async () => {
    const resp = await api.get('/absences/export-csv', { params, responseType: 'blob' });
    const url = URL.createObjectURL(resp.data);
    const a = document.createElement('a'); a.href = url;
    a.download = `absences_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        {estEnseignant && !eleveIdFixe && (
          <select value={classeId} onChange={e => setClasseId(e.target.value)}
            className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Toutes les classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        )}
        <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
          placeholder="Du…"
          className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
          placeholder="Au…"
          className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <select value={type} onChange={e => setType(e.target.value)}
          className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Tous types</option>
          {Object.entries(TYPE_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={justifiee} onChange={e => setJustifiee(e.target.value)}
          className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Toutes</option>
          <option value="true">Justifiées</option>
          <option value="false">Non justifiées</option>
        </select>
        {estEnseignant && (
          <button onClick={exporter}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 ml-auto">
            <Download className="w-4 h-4" /> Exporter CSV
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : absences.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune absence pour ces critères</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Élève</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Durée</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Statut</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Motif</th>
                {estEnseignant && <th className="w-8" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {absences.map(a => (
                <LigneAbsence key={a.id} absence={a} estEnseignant={estEnseignant}
                  onJustifier={(id, j, just) => mutJustifier.mutate({ id, justifiee: j, justificatif: just })} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Onglet STATISTIQUES ──────────────────────────────────────────────────────

function OngletStats({ classes, eleveIdFixe }) {
  const { utilisateur } = useAuth();
  const estEnseignant = ['ENSEIGNANT', 'ADMIN'].includes(utilisateur?.role);

  const [classeId, setClasseId] = useState('');
  const [eleveId,  setEleveId]  = useState(eleveIdFixe ?? '');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin,   setDateFin]   = useState('');
  const [ongletStats, setOngletStats] = useState(eleveIdFixe ? 'eleve' : 'classe');

  const params = { ...(dateDebut && { dateDebut }), ...(dateFin && { dateFin }) };

  const { data: statsEleve } = useQuery({
    queryKey: ['stats-absence-eleve', eleveId, params],
    queryFn: () => api.get(`/absences/stats/eleve/${eleveId}`, { params }).then(r => r.data),
    enabled: !!eleveId,
  });

  const { data: statsClasse = [] } = useQuery({
    queryKey: ['stats-absence-classe', classeId, params],
    queryFn: () => api.get(`/absences/stats/classe/${classeId}`, { params }).then(r => r.data),
    enabled: !!classeId && estEnseignant,
  });

  const { data: classeMembres = [] } = useQuery({
    queryKey: ['classe-eleves-stats', classeId],
    queryFn: () => api.get(`/absences/eleves/${classeId}`).then(r => r.data),
    enabled: !!classeId && estEnseignant,
  });

  const donneesBar = (statsEleve?.parMois ?? []).map(m => ({
    mois: formatMois(m.mois), heures: Math.round(m.heures * 10) / 10,
  }));

  return (
    <div className="space-y-5">
      {/* Filtres globaux */}
      <div className="flex flex-wrap gap-3">
        <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
          className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
          className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      {/* Sous-onglets */}
      {estEnseignant && !eleveIdFixe && (
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
          {[['eleve', 'Par élève'], ['classe', 'Par classe']].map(([k, l]) => (
            <button key={k} onClick={() => setOngletStats(k)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${ongletStats === k ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Stats par élève */}
      {ongletStats === 'eleve' && (
        <div className="space-y-5">
          {estEnseignant && (
            <div className="flex flex-wrap gap-3">
              <select value={classeId} onChange={e => { setClasseId(e.target.value); setEleveId(''); }}
                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Choisir une classe…</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              {classeId && (
                <select value={eleveId} onChange={e => setEleveId(e.target.value)}
                  className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Choisir un élève…</option>
                  {classeMembres.map(({ eleve }) => <option key={eleve.id} value={eleve.id}>{eleve.nom} {eleve.prenom}</option>)}
                </select>
              )}
            </div>
          )}

          {statsEleve ? (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard titre="Total absences" valeur={statsEleve.totalAbsences} icone={CalendarDays} couleur="bg-red-500" />
                <StatCard titre="Heures perdues" valeur={`${statsEleve.totalHeures}h`} icone={Clock} couleur="bg-amber-500" />
                <StatCard titre="Justifiées" valeur={statsEleve.justifiees} icone={CheckCircle2} couleur="bg-green-500" />
                <StatCard titre="Non justifiées" valeur={statsEleve.nonJustifiees} icone={AlertTriangle} couleur="bg-rose-600" />
              </div>

              {/* Taux de justification */}
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Taux de justification</span>
                  <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{statsEleve.tauxJustification}%</span>
                </div>
                <ProgressBar value={statsEleve.tauxJustification} max={100} />
                <div className="flex gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="text-amber-600 dark:text-amber-400">{statsEleve.retards} retard{statsEleve.retards > 1 ? 's' : ''}</span>
                  <span className="text-red-500 dark:text-red-400">{statsEleve.absencesSeules} absence{statsEleve.absencesSeules > 1 ? 's' : ''}</span>
                </div>
              </Card>

              {/* Graphique heures/mois */}
              {donneesBar.length > 0 && (
                <Card>
                  <CardHeader title="Heures d'absence par mois" />
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={donneesBar} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={v => [`${v}h`, 'Heures absentes']} />
                      <Bar dataKey="heures" fill="#ef4444" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </>
          ) : !eleveIdFixe ? (
            <div className="text-center py-12 text-slate-400">
              <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sélectionnez un élève pour voir ses statistiques</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Stats par classe */}
      {ongletStats === 'classe' && estEnseignant && (
        <div className="space-y-4">
          <select value={classeId} onChange={e => setClasseId(e.target.value)}
            className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-xs">
            <option value="">Choisir une classe…</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>

          {classeId && statsClasse.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Élève</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Heures</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Absences</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Retards</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Non justif.</th>
                    <th className="px-4 py-2.5 w-32"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {statsClasse.map((s, i) => {
                    const pctNonJust = s.totalAbsences > 0
                      ? Math.round((s.nonJustifiees / s.totalAbsences) * 100)
                      : 0;
                    return (
                      <tr key={s.eleve.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800 ${s.totalHeures >= 10 ? 'bg-red-50/50 dark:bg-red-900/20' : ''}`}>
                        <td className="px-5 py-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{s.eleve.nom} {s.eleve.prenom}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-50">{s.totalHeures}h</td>
                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{s.totalAbsences}</td>
                        <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">{s.retards}</td>
                        <td className="px-4 py-3 text-right text-red-500 dark:text-red-400">{s.nonJustifiees}</td>
                        <td className="px-4 py-3">
                          {s.totalAbsences > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-red-400"
                                  style={{ width: `${pctNonJust}%` }} />
                              </div>
                              <span className="text-xs text-slate-400 w-8">{pctNonJust}%</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {classeId && statsClasse.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">Aucune absence pour cette classe</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

const ONGLETS_ENSEIGNANT = [
  { id: 'saisie',  label: 'Saisie',       icon: UserX },
  { id: 'liste',   label: 'Liste',        icon: CalendarDays },
  { id: 'stats',   label: 'Statistiques', icon: BarChart },
];
const ONGLETS_ELEVE = [
  { id: 'liste', label: 'Mes absences',   icon: CalendarDays },
  { id: 'stats', label: 'Mon suivi',      icon: BarChart },
];

export default function Absences() {
  const { utilisateur } = useAuth();
  const estEnseignant = ['ENSEIGNANT', 'ADMIN'].includes(utilisateur?.role);
  const estEleve = utilisateur?.role === 'ELEVE';

  const [onglet, setOnglet] = useState(estEnseignant ? 'saisie' : 'liste');

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data),
    enabled: estEnseignant,
  });

  const onglets = estEnseignant ? ONGLETS_ENSEIGNANT : ONGLETS_ELEVE;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-red-500" /> Absences & assiduité
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
          {estEnseignant ? 'Saisie, suivi et statistiques d\'assiduité' : 'Historique de vos absences et retards'}
        </p>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        {onglets.map(({ id, label }) => (
          <button key={id} onClick={() => setOnglet(id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${onglet === id ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div>
        {onglet === 'saisie' && estEnseignant && <OngletSaisie classes={classes} />}
        {onglet === 'liste' && (
          <OngletListe
            classes={classes}
            eleveIdFixe={estEleve ? utilisateur.id : undefined}
          />
        )}
        {onglet === 'stats' && (
          <OngletStats
            classes={classes}
            eleveIdFixe={estEleve ? utilisateur.id : undefined}
          />
        )}
      </div>
    </div>
  );
}
