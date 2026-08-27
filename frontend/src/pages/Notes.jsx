import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Star, TrendingUp, BarChart2, Download, Copy, Check, Table2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import StatCard from '../components/ui/StatCard.jsx';

const PALIERS = {
  1: { label: 'Novice',      classe: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  2: { label: 'Débrouillé',  classe: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  3: { label: 'Averti',      classe: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  4: { label: 'Expert',      classe: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
};

const TYPE_LABELS = {
  DEVOIR_SURVEILLE: 'Devoir surveillé', TRAVAUX_PRATIQUES: 'Travaux pratiques',
  ORAL: 'Oral', PROJET: 'Projet', CCF: 'CCF',
};

function PalierBadge({ valeur }) {
  if (valeur === null || valeur === undefined) {
    return <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full font-medium">NE</span>;
  }
  const p = PALIERS[valeur];
  if (!p) return <span className="text-xs text-gray-500">{valeur}</span>;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.classe}`}>
      {valeur} — {p.label}
    </span>
  );
}

function DistributionPaliers({ notes }) {
  const comptes = [1, 2, 3, 4].map((p) => notes.filter((n) => n.valeur === p).length);
  const max = Math.max(...comptes, 1);
  const couleurs = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400'];
  const labels = ['Novice', 'Débrouillé', 'Averti', 'Expert'];

  return (
    <div className="flex items-end gap-3 h-28">
      {comptes.map((c, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-xs font-bold text-gray-700">{c}</span>
          <div className="w-full flex flex-col justify-end" style={{ height: '60px' }}>
            <div
              className={`w-full rounded-t transition-all ${couleurs[i]}`}
              style={{ height: `${Math.max(4, (c / max) * 60)}px` }}
            />
          </div>
          <span className="text-[9px] text-gray-400 text-center leading-tight">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Cellule note compacte (grille classe × évaluations) ─────────────────────

function CelluleNote({ valeur }) {
  if (valeur === null || valeur === undefined) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-6 rounded text-[11px] text-gray-300 border border-gray-100">
        —
      </span>
    );
  }
  const p = PALIERS[valeur];
  return (
    <span
      title={p?.label ?? String(valeur)}
      className={`inline-flex items-center justify-center w-8 h-6 rounded text-[11px] font-bold ${p?.classe ?? 'bg-gray-100 text-gray-500'}`}
    >
      {valeur}
    </span>
  );
}

// ─── Vue tableau : grille classe × évaluations, chiffrée ──────────────────────

function TableauNotesClasse({ classeId, onSelectEleve }) {
  const [copie, setCopie] = useState(false);

  const { data: tableau, isLoading } = useQuery({
    queryKey: ['notes-tableau', classeId],
    queryFn: () => api.get('/notes/tableau-classe', { params: { classeId } }).then((r) => r.data),
    enabled: !!classeId,
  });

  const copierPourPronote = async () => {
    if (!tableau) return;
    const lignes = [
      ['Élève', ...tableau.evaluations.map((e) => e.titre)].join('\t'),
      ...tableau.eleves.map((eleve) => {
        const valeurs = tableau.evaluations.map((e) => {
          const v = tableau.notes[eleve.id]?.[e.id];
          return v !== null && v !== undefined ? String(v) : '';
        });
        return [`${eleve.nom} ${eleve.prenom}`, ...valeurs].join('\t');
      }),
    ];
    try {
      await navigator.clipboard.writeText(lignes.join('\n'));
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      alert('Impossible de copier automatiquement — sélectionnez et copiez le tableau manuellement.');
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  if (!tableau || tableau.evaluations.length === 0) {
    return (
      <Card>
        <p className="text-sm text-center text-gray-400 py-4">
          Aucune évaluation créée pour cette classe.
        </p>
      </Card>
    );
  }

  return (
    <Card padding={false}>
      <div className="px-6 pt-6 pb-4">
        <CardHeader
          title="Tableau de bord des notes"
          subtitle={`${tableau.eleves.length} élève${tableau.eleves.length !== 1 ? 's' : ''} · ${tableau.evaluations.length} évaluation${tableau.evaluations.length !== 1 ? 's' : ''} — cliquer sur un élève pour voir le détail`}
          action={
            <button
              onClick={copierPourPronote}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                copie
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              title="Copie une grille (élèves × évaluations) au format tableur, à coller directement dans Pronote ou Excel"
            >
              {copie ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copie ? 'Copié !' : 'Copier pour Pronote'}
            </button>
          }
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-gray-50">
              <th className="text-left px-4 py-2 text-[11px] font-semibold text-gray-400 uppercase min-w-[130px] sticky left-0 bg-white">
                Élève
              </th>
              {tableau.evaluations.map((e) => (
                <th
                  key={e.id}
                  title={`${e.titre} · ${TYPE_LABELS[e.type] ?? e.type}${e.datePassage ? ` · ${format(new Date(e.datePassage), 'd MMM yyyy', { locale: fr })}` : ''}`}
                  className="px-1 py-2 text-center text-[11px] font-bold text-gray-700 cursor-help whitespace-nowrap"
                >
                  {e.datePassage ? format(new Date(e.datePassage), 'd/MM', { locale: fr }) : '—'}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {tableau.eleves.map((eleve) => (
              <tr key={eleve.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-2 sticky left-0 bg-white">
                  <button
                    onClick={() => onSelectEleve(eleve.id)}
                    className="font-medium text-gray-800 hover:text-indigo-600 hover:underline text-left"
                  >
                    {eleve.nom} {eleve.prenom}
                  </button>
                </td>
                {tableau.evaluations.map((e) => (
                  <td key={e.id} className="px-1 py-2 text-center">
                    <CelluleNote valeur={tableau.notes[eleve.id]?.[e.id] ?? null} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-gray-50 flex flex-wrap gap-3">
        {Object.entries(PALIERS).map(([v, p]) => (
          <span key={v} className={`text-xs px-2 py-0.5 rounded border border-transparent font-medium ${p.classe}`}>
            {v} = {p.label}
          </span>
        ))}
        <span className="text-xs px-2 py-0.5 rounded text-gray-400 border border-gray-100">— = Pas de note</span>
      </div>
    </Card>
  );
}

export default function Notes() {
  const { utilisateur } = useAuth();
  const estEnseignant = ['ADMIN', 'ENSEIGNANT'].includes(utilisateur?.role);
  const estEleve = utilisateur?.role === 'ELEVE';

  const [classeId, setClasseId] = useState('');
  const [eleveId, setEleveId] = useState(estEleve ? utilisateur.id : '');

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then((r) => r.data),
    enabled: estEnseignant,
  });

  const { data: classeDetail } = useQuery({
    queryKey: ['classe', classeId],
    queryFn: () => api.get(`/classes/${classeId}`).then((r) => r.data),
    enabled: estEnseignant && !!classeId,
  });
  const eleves = classeDetail?.eleves?.map((e) => e.eleve) ?? [];

  const { data: result, isLoading } = useQuery({
    queryKey: ['notes', eleveId],
    queryFn: () => api.get('/notes', { params: { eleveId, limite: 100 } }).then((r) => r.data),
    enabled: !!eleveId,
  });
  const notes = result?.notes ?? [];
  const notees = notes.filter((n) => n.valeur !== null);
  const moyenne = notees.length
    ? (notees.reduce((s, n) => s + n.valeur, 0) / notees.length).toFixed(1)
    : null;

  const exporterCsv = async () => {
    const params = {};
    if (eleveId)  params.eleveId  = eleveId;
    if (classeId) params.classeId = classeId;
    const resp = await api.get('/notes/export-csv', { params, responseType: 'blob' });
    const url = URL.createObjectURL(resp.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
          <p className="text-sm text-gray-500 mt-1">Carnet de notes — paliers d'évaluation (1 Novice → 4 Expert)</p>
        </div>
        {estEnseignant && (
          <button
            onClick={exporterCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
        )}
      </div>

      {estEnseignant && (
        <Card>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <label className="text-xs font-medium text-gray-600">Classe</label>
              <select
                value={classeId}
                onChange={(e) => { setClasseId(e.target.value); setEleveId(''); }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Sélectionner une classe —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>

            {classeId && (
              <div className="flex flex-col gap-1.5 min-w-[200px]">
                <label className="text-xs font-medium text-gray-600">Élève</label>
                <select
                  value={eleveId}
                  onChange={(e) => setEleveId(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Sélectionner un élève —</option>
                  {eleves.map((e) => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
                </select>
              </div>
            )}
          </div>
        </Card>
      )}

      {!classeId && estEnseignant && (
        <div className="text-center py-16 text-gray-400">
          <Table2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sélectionnez une classe pour afficher le tableau de bord des notes</p>
        </div>
      )}

      {classeId && !eleveId && estEnseignant && (
        <TableauNotesClasse classeId={classeId} onSelectEleve={setEleveId} />
      )}

      {isLoading && eleveId && (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      )}

      {eleveId && !isLoading && (
        <>
          {estEnseignant && (
            <button
              onClick={() => setEleveId('')}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              ← Retour au tableau de la classe
            </button>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard titre="Total notes" valeur={notes.length} icone={BookOpen} />
            <StatCard titre="Évaluées" valeur={notees.length} icone={Star} couleur="bg-emerald-500" />
            <StatCard titre="Non évaluées" valeur={notes.length - notees.length} icone={BarChart2} couleur="bg-gray-400" />
            <StatCard
              titre="Palier moyen"
              valeur={moyenne ? `${moyenne}/4` : '—'}
              icone={TrendingUp}
              couleur="bg-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {notees.length > 0 && (
              <Card className="lg:col-span-1">
                <CardHeader title="Distribution" />
                <DistributionPaliers notes={notees} />
              </Card>
            )}

            <Card
              padding={false}
              className={notees.length > 0 ? 'lg:col-span-3' : 'lg:col-span-4'}
            >
              <div className="px-6 pt-6 pb-4">
                <CardHeader
                  title="Historique des évaluations"
                  subtitle={`${notes.length} entrée${notes.length !== 1 ? 's' : ''}`}
                />
              </div>

              {notes.length === 0 ? (
                <div className="px-6 pb-8 text-center text-gray-400 text-sm">
                  Aucune note enregistrée pour cet élève.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-t border-gray-50">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Évaluation</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Palier</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Commentaire</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {notes.map((note) => (
                        <tr key={note.id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-3 font-medium text-gray-800">
                            {note.evaluation?.titre ?? '—'}
                          </td>
                          <td className="px-6 py-3">
                            {note.evaluation?.type && <Badge value={note.evaluation.type} />}
                          </td>
                          <td className="px-6 py-3 text-gray-500">
                            {note.evaluation?.datePassage
                              ? format(new Date(note.evaluation.datePassage), 'd MMM yyyy', { locale: fr })
                              : '—'}
                          </td>
                          <td className="px-6 py-3">
                            <PalierBadge valeur={note.valeur} />
                          </td>
                          <td className="px-6 py-3 text-gray-500 max-w-xs truncate">
                            {note.commentaire ?? <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
