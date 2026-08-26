import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, GraduationCap, Users, ClipboardList, ArrowRight,
  UserPlus, Plus, Search, BarChart2,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Spinner from '../components/ui/Spinner.jsx';

const TYPE_LABELS = {
  DEVOIR_SURVEILLE: 'DS', TRAVAUX_PRATIQUES: 'TP',
  ORAL: 'Oral', PROJET: 'Projet', CCF: 'CCF',
};

// ─── Tableau de synthèse compétences × élèves ────────────────────────────────

// Mapping NiveauCompetence → affichage palier
const NIVEAU_CELL = {
  null:       { bg: 'bg-gray-100 dark:bg-slate-700',      text: 'text-gray-400 dark:text-slate-400',    label: 'NE', score: 0, libelle: 'Non évalué'  },
  NON_ACQUIS: { bg: 'bg-red-100 dark:bg-red-900/40',       text: 'text-red-700 dark:text-red-300',       label: 'N',  score: 1, libelle: 'Novice'       },
  EN_COURS:   { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', label: 'D',  score: 2, libelle: 'Débrouillé'  },
  ACQUIS:     { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300', label: 'A',  score: 3, libelle: 'Averti'       },
  DEPASSE:    { bg: 'bg-green-100 dark:bg-green-900/40',   text: 'text-green-700 dark:text-green-300',   label: 'E',  score: 4, libelle: 'Expert'       },
};

const SCORE_TO_NIVEAU = ['null', 'NON_ACQUIS', 'EN_COURS', 'ACQUIS', 'DEPASSE'];

function TableauSynthese({ classeId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['classe-synthese', classeId],
    queryFn: () => api.get(`/classes/${classeId}/synthese`).then((r) => r.data),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!data) return null;

  const { eleves, poles, niveaux } = data;

  if (!poles?.length) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm space-y-1">
        <p>Aucune compétence trouvée pour cette classe.</p>
        <p className="text-xs">Importez un référentiel et liez des évaluations à des séquences.</p>
      </div>
    );
  }

  // Toutes les compétences à plat (dans l'ordre des pôles)
  const toutesComps = poles.flatMap((p) => p.competences);

  // Palier moyen d'un élève (ignorer les NE)
  const niveauMoyen = (eleveId) => {
    const scores = toutesComps
      .filter((c) => niveaux[eleveId]?.[c.id] != null)
      .map((c) => NIVEAU_CELL[niveaux[eleveId][c.id]]?.score ?? 0);
    if (!scores.length) return null;
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    return SCORE_TO_NIVEAU[Math.round(avg)] ?? 'null';
  };

  // Largeur dynamique pour le scroll horizontal
  const totalCols = toutesComps.length;
  const minWidth  = 180 + totalCols * 58 + 80;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm bg-white">
      <table
        className="text-xs border-collapse"
        style={{ minWidth: `${minWidth}px` }}
      >
        <thead>
          {/* ── Ligne 1 : en-têtes de pôles ─────────────────────────────── */}
          <tr className="border-b border-gray-200 bg-indigo-50/40 dark:bg-indigo-900/20">
            <th
              rowSpan={2}
              className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide border-r border-gray-200 sticky left-0 bg-white z-20 min-w-[180px]"
            >
              Élève
            </th>

            {poles.map((pole) => (
              <th
                key={pole.id}
                colSpan={pole.competences.length}
                className="px-2 py-2 text-center border-l border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/30"
              >
                <p className="font-bold text-indigo-800 dark:text-indigo-300 leading-tight">{pole.code}</p>
                <p
                  className="font-normal text-indigo-600 dark:text-indigo-400 text-[11px] leading-tight truncate max-w-[200px] mx-auto"
                  title={pole.titre}
                >
                  {pole.titre}
                </p>
              </th>
            ))}

            <th
              rowSpan={2}
              className="px-3 py-2.5 text-center font-semibold text-gray-600 text-xs uppercase tracking-wide border-l border-gray-300 sticky right-0 bg-gray-50 z-20 min-w-[72px]"
            >
              Moy.
            </th>
          </tr>

          {/* ── Ligne 2 : codes de compétences ──────────────────────────── */}
          <tr className="border-b border-gray-200 bg-gray-50">
            {poles.flatMap((pole) =>
              pole.competences.map((comp, i) => (
                <th
                  key={comp.id}
                  className={`px-1 py-1.5 text-center min-w-[54px] max-w-[76px] ${
                    i === 0 ? 'border-l border-indigo-200 dark:border-indigo-800' : 'border-l border-gray-100'
                  }`}
                  title={comp.description}
                >
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 block text-[11px]">
                    {comp.code}
                  </span>
                  <span className="text-gray-400 font-normal block truncate text-[10px] max-w-[70px] mx-auto leading-tight">
                    {comp.description.split(' ').slice(0, 3).join(' ')}
                    {comp.description.split(' ').length > 3 ? '…' : ''}
                  </span>
                </th>
              ))
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-50">
          {eleves.map((eleve, idx) => {
            const moy    = niveauMoyen(eleve.id);
            const cfgMoy = NIVEAU_CELL[moy ?? 'null'] ?? NIVEAU_CELL.null;
            const rowBg  = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30';

            return (
              <tr key={eleve.id} className={rowBg}>
                {/* Nom de l'élève — sticky gauche */}
                <td className={`px-4 py-2 font-medium text-gray-900 border-r border-gray-200 sticky left-0 z-10 ${rowBg}`}>
                  {eleve.nom} {eleve.prenom}
                </td>

                {/* Cellules compétences */}
                {poles.flatMap((pole) =>
                  pole.competences.map((comp, i) => {
                    const niveau = niveaux[eleve.id]?.[comp.id] ?? null;
                    const cfg    = NIVEAU_CELL[niveau] ?? NIVEAU_CELL.null;
                    return (
                      <td
                        key={comp.id}
                        className={`py-1.5 text-center ${
                          i === 0 ? 'border-l border-indigo-100 dark:border-indigo-900' : 'border-l border-gray-50'
                        }`}
                      >
                        <span
                          className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold ${cfg.bg} ${cfg.text}`}
                          title={cfg.libelle}
                        >
                          {cfg.label}
                        </span>
                      </td>
                    );
                  })
                )}

                {/* Moyenne — sticky droite */}
                <td className={`px-3 py-1.5 text-center border-l border-gray-300 sticky right-0 z-10 ${rowBg}`}>
                  {moy ? (
                    <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-black ${cfgMoy.bg} ${cfgMoy.text}`}>
                      {cfgMoy.label}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Légende ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">Légende :</span>
        {Object.entries(NIVEAU_CELL).map(([key, cfg]) => (
          <span
            key={key}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}
          >
            {cfg.label}
            <span className="font-normal opacity-75 text-[11px]">— {cfg.libelle}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ClasseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const qc = useQueryClient();
  const [rechercheSans, setRechercheSans] = useState('');
  const [vueSynthese, setVueSynthese] = useState(false);

  const { data: classe, isLoading, error } = useQuery({
    queryKey: ['classe', id],
    queryFn: () => api.get(`/classes/${id}`).then((r) => r.data),
  });

  const { data: evalsData } = useQuery({
    queryKey: ['evaluations', { classeId: id }],
    queryFn: () => api.get('/evaluations', { params: { classeId: id, limite: 20 } }).then((r) => r.data),
    enabled: !!id,
  });

  const { data: tousEleves } = useQuery({
    queryKey: ['eleves-tous'],
    queryFn: () => api.get('/users', { params: { role: 'ELEVE', limite: 500 } }).then((r) => r.data),
    enabled: ['ADMIN', 'ENSEIGNANT'].includes(utilisateur?.role),
  });

  const ajouterMutation = useMutation({
    mutationFn: (eleveId) => api.patch(`/users/${eleveId}/classe`, { classeId: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classe', id] });
      qc.invalidateQueries({ queryKey: ['eleves-tous'] });
    },
  });

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error || !classe) return (
    <div className="text-center py-16 text-gray-400">
      <p>Classe introuvable.</p>
      <button onClick={() => navigate('/classes')} className="mt-2 text-indigo-600 text-sm hover:underline">
        Retour aux classes
      </button>
    </div>
  );

  const evaluations = evalsData?.evaluations ?? [];
  const peutGerer = ['ADMIN', 'ENSEIGNANT'].includes(utilisateur?.role);

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <button
        onClick={() => navigate('/classes')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="w-4 h-4" /> Toutes les classes
      </button>

      {/* En-tête */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{classe.nom}</h1>
              <p className="text-gray-500 mt-0.5">{classe.niveau} · {classe.annee}</p>
            </div>
          </div>
          {peutGerer && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVueSynthese((v) => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  vueSynthese
                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <BarChart2 className="w-4 h-4" />
                {vueSynthese ? 'Vue normale' : 'Tableau de synthèse'}
              </button>
              <button
                onClick={() => navigate('/evaluations', { state: { classeId: id } })}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <ClipboardList className="w-4 h-4" />
                Nouvelle évaluation
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-5 pt-5 border-t border-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4 text-gray-400" />
            <span><strong>{classe._count?.eleves ?? 0}</strong> élève{classe._count?.eleves !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <ClipboardList className="w-4 h-4 text-gray-400" />
            <span><strong>{evaluations.length}</strong> évaluation{evaluations.length !== 1 ? 's' : ''}</span>
          </div>
          {!classe.actif && <Badge value="ARCHIVEE" label="Classe inactive" />}
        </div>
      </div>

      {/* ── Tableau de synthèse paliers ─────────────────────────────────── */}
      {vueSynthese && peutGerer && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-gray-700">
              Tableau de synthèse — {classe.nom}
            </h2>
          </div>
          <TableauSynthese classeId={id} />
        </div>
      )}

      <div className={vueSynthese ? 'hidden' : 'grid grid-cols-1 lg:grid-cols-5 gap-6'}>
        {/* Liste des élèves */}
        <div className="lg:col-span-2">
          <Card padding={false}>
            <div className="px-5 pt-5 pb-3">
              <CardHeader
                title="Élèves inscrits"
                subtitle={`${classe.eleves?.length ?? 0} élève${classe.eleves?.length !== 1 ? 's' : ''}`}
                action={
                  peutGerer && (
                    <button
                      onClick={() => navigate('/users')}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Gérer
                    </button>
                  )
                }
              />
            </div>
            {!classe.eleves || classe.eleves.length === 0 ? (
              <div className="px-5 pb-6 text-center py-8 text-gray-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucun élève inscrit</p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-96">
                {classe.eleves
                  .sort((a, b) => a.eleve.nom.localeCompare(b.eleve.nom))
                  .map(({ eleve }) => (
                    <div key={eleve.id} className="flex items-center gap-3 px-5 py-2.5 border-t border-gray-50 hover:bg-gray-50 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-indigo-600">
                          {eleve.prenom[0]}{eleve.nom[0]}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {eleve.nom} {eleve.prenom}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{eleve.email}</p>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </Card>
        </div>

        {/* Évaluations de la classe */}
        <div className="lg:col-span-3">
          <Card padding={false}>
            <div className="px-5 pt-5 pb-3">
              <CardHeader
                title="Évaluations"
                action={
                  <button
                    onClick={() => navigate('/evaluations', { state: { filtreClasseId: id } })}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Voir tout <ArrowRight className="w-3 h-3" />
                  </button>
                }
              />
            </div>
            {evaluations.length === 0 ? (
              <div className="px-5 pb-6 text-center py-8 text-gray-400">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucune évaluation pour cette classe</p>
                {peutGerer && (
                  <button
                    onClick={() => navigate('/evaluations', { state: { classeId: id } })}
                    className="mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Créer la première évaluation
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-gray-50">
                      <th className="text-left px-5 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Titre</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {evaluations.map((ev) => (
                      <tr
                        key={ev.id}
                        onClick={() => navigate(`/evaluations/${ev.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3 font-medium text-gray-900 truncate max-w-[180px]">{ev.titre}</td>
                        <td className="px-3 py-3 text-gray-500">{TYPE_LABELS[ev.type] ?? ev.type}</td>
                        <td className="px-3 py-3"><Badge value={ev.statut} /></td>
                        <td className="px-3 py-3 text-gray-400 text-xs">
                          {ev.datePassage
                            ? format(new Date(ev.datePassage), 'dd/MM/yy', { locale: fr })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── Élèves sans classe disponibles à ajouter ────────────────────── */}
      {peutGerer && (() => {
        const inscritsIds = new Set((classe.eleves ?? []).map((e) => e.eleve.id));
        const sansClaase = (tousEleves?.utilisateurs ?? []).filter(
          (u) => !u.classe && !inscritsIds.has(u.id)
        );
        const filtrés = rechercheSans.trim()
          ? sansClaase.filter((u) =>
              `${u.nom} ${u.prenom} ${u.email}`.toLowerCase().includes(rechercheSans.toLowerCase())
            )
          : sansClaase;

        if (sansClaase.length === 0) return null;

        return (
          <Card padding={false}>
            <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold text-gray-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-orange-500" />
                  Élèves sans classe
                  <span className="text-xs font-normal text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                    {sansClaase.length}
                  </span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Cliquez sur "+" pour inscrire un élève dans cette classe</p>
              </div>
              {sansClaase.length > 5 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    value={rechercheSans}
                    onChange={(e) => setRechercheSans(e.target.value)}
                    placeholder="Filtrer…"
                    className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                  />
                </div>
              )}
            </div>

            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
              {filtrés.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400 text-center">Aucun résultat</p>
              ) : (
                filtrés.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-orange-50/40 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-orange-600">{u.prenom[0]}{u.nom[0]}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{u.nom} {u.prenom}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                    <button
                      onClick={() => ajouterMutation.mutate(u.id)}
                      disabled={ajouterMutation.isPending}
                      title={`Ajouter à ${classe.nom}`}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>
        );
      })()}
    </div>
  );
}
