import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, FileText, Sparkles, CheckCircle2,
  Upload, AlertCircle, ChevronDown, ChevronUp, Clock, MessageSquare,
  Download, Trash2, BookOpen, Target, Save, Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import UploadDevoir from '../components/evaluation/UploadDevoir.jsx';

const TYPE_LABELS = {
  DEVOIR_SURVEILLE: 'Devoir surveillé', TRAVAUX_PRATIQUES: 'Travaux pratiques',
  ORAL: 'Oral', PROJET: 'Projet', CCF: 'CCF',
};

// ─── Panneau soumissions (vue enseignant) ─────────────────────────────────────

// ─── Panneau sujet / énoncé ───────────────────────────────────────────────────

function SujetPanel({ evaluationId, peutGerer }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [erreur,    setErreur]    = useState(null);
  const [drag,      setDrag]      = useState(false);

  const { data: sujet, refetch } = useQuery({
    queryKey: ['eval-sujet', evaluationId],
    queryFn: () => api.get(`/evaluations/${evaluationId}/sujet/info`).then((r) => r.data),
  });

  const handleFichier = async (file) => {
    if (!file) return;
    setErreur(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('sujet', file);
      await api.post(`/evaluations/${evaluationId}/sujet`, fd, {
        headers: { 'Content-Type': undefined },
      });
      refetch();
    } catch (err) {
      setErreur(err?.response?.data?.message ?? 'Erreur lors du dépôt');
    } finally {
      setUploading(false);
    }
  };

  const handleSupprimer = async () => {
    await api.delete(`/evaluations/${evaluationId}/sujet`);
    refetch();
  };

  const [downloading, setDownloading] = useState(false);

  const handleTelechargement = async () => {
    setDownloading(true);
    try {
      const resp = await api.get(`/evaluations/${evaluationId}/sujet`, { responseType: 'blob' });
      const url  = URL.createObjectURL(resp.data);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = sujet?.nom ?? 'sujet';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErreur(err?.response?.data?.message ?? 'Erreur lors du téléchargement');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-indigo-500" />Énoncé / Sujet</span>}
        subtitle={peutGerer ? 'Déposez ici le sujet à distribuer aux élèves (PDF, Word ou Excel)' : 'Document mis à disposition par l\'enseignant'}
      />

      {sujet ? (
        /* Sujet déposé */
        <div className="flex items-center justify-between gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{sujet.nom}</p>
              <p className="text-xs text-gray-500">{(sujet.taille / 1024).toFixed(0)} Ko</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleTelechargement}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {downloading ? <Spinner size="sm" /> : <Download className="w-3.5 h-3.5" />}
              {downloading ? 'Téléchargement…' : 'Télécharger'}
            </button>
            {peutGerer && (
              <>
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  Remplacer
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={(e) => handleFichier(e.target.files[0])}
                  />
                </label>
                <button
                  onClick={handleSupprimer}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer l'énoncé"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      ) : peutGerer ? (
        /* Zone de dépôt (enseignant, pas encore de sujet) */
        <label
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFichier(f);
          }}
          className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            drag
              ? 'border-indigo-400 bg-indigo-50/80 text-indigo-600'
              : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50'
          }`}
        >
          {uploading ? (
            <Spinner size="sm" />
          ) : (
            <>
              <Upload className={`w-8 h-8 ${drag ? 'text-indigo-400' : 'text-gray-300'}`} />
              <p className="text-sm font-medium text-gray-500">
                {drag ? 'Déposez le fichier ici' : 'Glissez un fichier ou cliquez pour parcourir'}
              </p>
              <p className="text-xs text-gray-400">PDF, Word ou Excel — 20 Mo max</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={(e) => handleFichier(e.target.files[0])}
          />
        </label>
      ) : (
        <p className="text-sm text-gray-400 py-4 text-center">Aucun énoncé disponible pour l'instant.</p>
      )}

      {erreur && (
        <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {erreur}
        </div>
      )}
    </Card>
  );
}

// ─── Paliers (partagés entre vue enseignant et élève) ────────────────────────

const PALIERS_CFG = {
  null: { label: 'NE', libelle: 'Non évalué',  bg: 'bg-gray-100',    text: 'text-gray-500',    border: 'border-gray-200',    btnCls: 'bg-gray-100 text-gray-500 border-gray-200 hover:border-gray-400' },
  1:    { label: 'N',  libelle: 'Novice',       bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-200',     btnCls: 'bg-red-50 text-red-600 border-red-200 hover:border-red-500' },
  2:    { label: 'D',  libelle: 'Débrouillé',   bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-orange-200',  btnCls: 'bg-orange-50 text-orange-600 border-orange-200 hover:border-orange-500' },
  3:    { label: 'A',  libelle: 'Averti',        bg: 'bg-yellow-100',  text: 'text-yellow-700',  border: 'border-yellow-200',  btnCls: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:border-yellow-500' },
  4:    { label: 'E',  libelle: 'Expert',        bg: 'bg-green-100',   text: 'text-green-700',   border: 'border-green-200',   btnCls: 'bg-green-50 text-green-700 border-green-200 hover:border-green-500' },
};

function PalierBadge({ valeur, taille = 'md' }) {
  const cfg = PALIERS_CFG[valeur] ?? PALIERS_CFG[null];
  const cls = taille === 'lg'
    ? `text-lg font-black px-4 py-2 rounded-xl border-2 ${cfg.bg} ${cfg.text} ${cfg.border}`
    : `text-xs font-bold px-2.5 py-1 rounded-lg border-2 ${cfg.bg} ${cfg.text} ${cfg.border}`;
  return (
    <span className={cls}>
      {cfg.label} <span className="font-normal opacity-70">— {cfg.libelle}</span>
    </span>
  );
}

// Convertit un ratio note/noteMax en palier 1-4
function ratioPalier(noteObtenue, noteMax) {
  if (!noteMax || noteObtenue == null) return null;
  const pct = noteObtenue / noteMax;
  if (pct >= 0.85) return 4;
  if (pct >= 0.65) return 3;
  if (pct >= 0.40) return 2;
  return 1;
}

const MENTION_CLS = {
  'Insuffisant': 'bg-red-100 text-red-700', 'Passable': 'bg-orange-100 text-orange-700',
  'Assez Bien': 'bg-yellow-100 text-yellow-700', 'Bien': 'bg-blue-100 text-blue-700',
  'Très Bien': 'bg-green-100 text-green-700',
};

// ─── Vue élève : statut + résultat correction ─────────────────────────────────

function StatutDevoir({ evaluationId, maSoumission }) {
  const [telechargement, setTelechargement] = useState(false);

  if (!maSoumission) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 bg-indigo-50 border border-indigo-100 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <Upload className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-indigo-800">À déposer</p>
          <p className="text-xs text-indigo-500">Vous n'avez pas encore rendu ce devoir</p>
        </div>
      </div>
    );
  }

  const telechargerMonFichier = async () => {
    setTelechargement(true);
    try {
      const resp = await api.get(`/evaluations/${evaluationId}/soumissions/${maSoumission.id}/fichier`, { responseType: 'blob' });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = maSoumission.fichierNom;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err?.response?.data?.message ?? 'Erreur lors du téléchargement');
    } finally {
      setTelechargement(false);
    }
  };

  const boutonTelecharger = (
    <button
      onClick={telechargerMonFichier}
      disabled={telechargement}
      title={`Télécharger ${maSoumission.fichierNom}`}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors flex-shrink-0"
    >
      {telechargement ? <Spinner size="sm" /> : <Download className="w-3.5 h-3.5" />}
      Télécharger
    </button>
  );

  if (maSoumission.corrigeeIA) {
    return (
      <div className="flex items-center justify-between gap-3 px-5 py-4 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-green-800">Corrigé</p>
            <p className="text-xs text-green-600 truncate">Correction disponible — {maSoumission.fichierNom}</p>
          </div>
        </div>
        {boutonTelecharger}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4 bg-blue-50 border border-blue-100 rounded-xl">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Clock className="w-4 h-4 text-blue-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-blue-800">Déposé</p>
          <p className="text-xs text-blue-600 truncate">En attente de correction — {maSoumission.fichierNom}</p>
        </div>
      </div>
      {boutonTelecharger}
    </div>
  );
}

function ResultatCorrection({ resultat, palierEnseignant }) {
  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-500" />Résultat de correction</span>}
      />
      <AffichageResultatIA resultat={resultat} palier={palierEnseignant} compact={false} />
    </Card>
  );
}

// ─── Affichage résultat IA : mode résumé / détail ────────────────────────────
// compact=true : utilisé dans le tableau enseignant (note déjà affichée inline)
// compact=false : utilisé dans la carte élève (affiche note + palier dans le résumé)

function AffichageResultatIA({ resultat, palier, compact = false }) {
  const [detail, setDetail] = useState(false);

  const pct       = resultat.noteMax > 0 ? Math.round((resultat.noteGlobale / resultat.noteMax) * 100) : 0;
  const mentionCls = MENTION_CLS[resultat.mention] ?? 'bg-gray-100 text-gray-700';

  // ── Mode résumé ───────────────────────────────────────────────────────────
  if (!detail) {
    return (
      <div className="space-y-2.5">
        {/* Note + palier (masqués en mode compact, déjà affichés dans la ligne) */}
        {!compact && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-black px-2.5 py-1 rounded-full ${mentionCls}`}>
              {resultat.noteGlobale}/{resultat.noteMax}
            </span>
            {palier != null && <PalierBadge valeur={palier} />}
            <span className="text-xs text-gray-500 font-medium">{resultat.mention}</span>
          </div>
        )}

        {/* Appréciation — 3 lignes max */}
        {resultat.appreciationGenerale && (
          <p className="text-xs text-gray-600 italic leading-relaxed line-clamp-3">
            {resultat.appreciationGenerale}
          </p>
        )}

        {/* Points forts + axes en 2 colonnes */}
        {(resultat.competencesIdentifiees?.length > 0 || resultat.conseilsPrioritaires?.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {resultat.competencesIdentifiees?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-emerald-700 mb-1">Points forts</p>
                <ul className="space-y-0.5">
                  {resultat.competencesIdentifiees.slice(0, 3).map((p, i) => (
                    <li key={i} className="flex items-start gap-1 text-xs text-gray-600">
                      <span className="text-emerald-500 flex-shrink-0 mt-0.5">·</span>
                      <span className="line-clamp-1">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {resultat.conseilsPrioritaires?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-1">À améliorer</p>
                <ul className="space-y-0.5">
                  {resultat.conseilsPrioritaires.slice(0, 3).map((p, i) => (
                    <li key={i} className="flex items-start gap-1 text-xs text-gray-600">
                      <span className="text-amber-500 flex-shrink-0 mt-0.5">·</span>
                      <span className="line-clamp-1">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setDetail(true)}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Voir le détail complet <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // ── Mode détail ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Note + palier */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <span className="text-4xl font-black text-gray-900">{resultat.noteGlobale}</span>
          <span className="text-xl text-gray-400">/{resultat.noteMax}</span>
          <span className={`ml-3 px-3 py-1 rounded-full text-sm font-semibold ${mentionCls}`}>
            {resultat.mention}
          </span>
        </div>
        {palier != null && <PalierBadge valeur={palier} taille="lg" />}
      </div>

      {/* Barre de score */}
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Appréciation complète */}
      {resultat.appreciationGenerale && (
        <p className="text-sm text-gray-600 italic pb-4 border-b border-gray-100 leading-relaxed">
          {resultat.appreciationGenerale}
        </p>
      )}

      {/* Critères par compétence */}
      {resultat.criteres?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Paliers par compétence</p>
          {resultat.criteres.map((c, i) => {
            const palierC = ratioPalier(c.noteObtenue, c.noteMax);
            const cfg = PALIERS_CFG[palierC] ?? PALIERS_CFG[null];
            return (
              <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg border ${cfg.border} ${cfg.bg}/30`}>
                <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                  {cfg.label}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-semibold text-gray-800">{c.nom}</span>
                    <span className="text-xs font-bold text-gray-500 ml-2">{c.noteObtenue}/{c.noteMax}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{c.justification}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compétences démontrées */}
      {resultat.competencesIdentifiees?.length > 0 && (
        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-emerald-700 mb-2">Compétences démontrées</p>
          <ul className="space-y-1">
            {resultat.competencesIdentifiees.map((c, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>{c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Axes de progrès */}
      {resultat.conseilsPrioritaires?.length > 0 && (
        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Axes de progrès</p>
          <ul className="space-y-1">
            {resultat.conseilsPrioritaires.map((c, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>{c}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => setDetail(false)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
      >
        <ChevronUp className="w-3 h-3" /> Réduire
      </button>
    </div>
  );
}

const BLOOM_CLS = {
  memorisation: 'bg-gray-100 text-gray-600', comprehension: 'bg-blue-100 text-blue-700',
  application: 'bg-indigo-100 text-indigo-700', analyse: 'bg-purple-100 text-purple-700',
  evaluation_creation: 'bg-amber-100 text-amber-700',
};
const BLOOM_LBL = {
  memorisation: 'Mémorisation', comprehension: 'Compréhension',
  application: 'Application', analyse: 'Analyse', evaluation_creation: 'Éval./Création',
};

// Paliers pour l'évaluation rapide inline (enseignant)
const PALIERS_INLINE = Object.entries(PALIERS_CFG).map(([v, cfg]) => ({
  valeur: v === 'null' ? null : Number(v),
  label: cfg.label,
  libelle: cfg.libelle,
  btnCls: cfg.btnCls,
}));

// eslint-disable-next-line no-unused-vars -- composant conservé pour réutilisation future, pas encore branché dans la page
function EvaluationRapide({ evaluationId, eleveId, palierActuel, onSauvegarde }) {
  const [palier, setPalier]       = useState(palierActuel ?? null);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [ok, setOk]               = useState(false);

  const choisir = async (valeur) => {
    setPalier(valeur);
    setSauvegarde(true);
    setOk(false);
    try {
      await api.post(`/evaluations/${evaluationId}/notes`, {
        notes: [{ eleveId, valeur }],
      });
      setOk(true);
      onSauvegarde?.();
      setTimeout(() => setOk(false), 2000);
    } finally {
      setSauvegarde(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold text-gray-500 mr-1">Palier :</span>
      {PALIERS_INLINE.map((p) => {
        const actif = palier === p.valeur;
        return (
          <button
            key={String(p.valeur)}
            onClick={() => choisir(p.valeur)}
            disabled={sauvegarde}
            title={p.libelle}
            className={[
              'px-2.5 py-1 rounded-lg text-xs font-bold border-2 transition-all select-none disabled:opacity-60',
              actif
                ? p.btnCls + ' ring-2 ring-offset-1 ring-current shadow-sm scale-105'
                : 'bg-white text-gray-300 border-gray-200 hover:' + p.btnCls,
            ].join(' ')}
          >
            {p.label}
          </button>
        );
      })}
      {ok && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
      {sauvegarde && <Spinner size="sm" />}
    </div>
  );
}

// eslint-disable-next-line no-unused-vars -- composant conservé pour réutilisation future, pas encore branché dans la page
function SoumissionsPanel({ evaluationId, soumissions, grille }) {
  const qc = useQueryClient();
  const [correctionEnCours, setCorrectionEnCours] = useState(null);
  const [resultats, setResultats] = useState({});
  const [questionsEnCours, setQuestionsEnCours] = useState(null);
  const [questions, setQuestions] = useState({});
  const [questionsOuvertes, setQuestionsOuvertes] = useState({});

  // Index palier actuel par eleveId depuis la grille
  // eslint-disable-next-line no-unused-vars -- calculé pour un futur affichage, pas encore consommé
  const paliersActuels = Object.fromEntries(
    (grille ?? []).map(({ eleve, note }) => [eleve.id, note?.valeur ?? null])
  );

  const genererQuestions = async (soumissionId, eleve, resultatIA) => {
    setQuestionsEnCours(soumissionId);
    try {
      // Construit le contenu à partir du résultat IA
      const contenu = [
        resultatIA.appreciationGenerale,
        ...(resultatIA.criteres ?? []).map((c) => `${c.nom} : ${c.justification}`),
        ...(resultatIA.competencesIdentifiees ?? []).map((comp) => `Compétence démontrée : ${comp}`),
      ].filter(Boolean).join('\n\n');

      const { resultat } = await api.post('/ia/questions-entretien', {
        contenuTravail: contenu,
        contexte: { nbQuestions: 6 },
      }).then((r) => r.data);

      setQuestions((prev) => ({ ...prev, [soumissionId]: resultat }));
      setQuestionsOuvertes((prev) => ({ ...prev, [soumissionId]: true }));
    } catch (err) {
      alert(err?.response?.data?.message ?? 'Erreur lors de la génération des questions');
    } finally {
      setQuestionsEnCours(null);
    }
  };

  const corrigerIA = async (soumissionId) => {
    setCorrectionEnCours(soumissionId);
    try {
      const { resultat } = await api
        .post(`/evaluations/${evaluationId}/soumissions/${soumissionId}/corriger-ia`)
        .then((r) => r.data);
      setResultats((prev) => ({ ...prev, [soumissionId]: resultat }));
      qc.invalidateQueries({ queryKey: ['evaluation', evaluationId, 'soumissions'] });
      qc.invalidateQueries({ queryKey: ['evaluation', evaluationId, 'notes'] });
    } catch (err) {
      alert(err?.response?.data?.message ?? 'Erreur lors de la correction IA');
    } finally {
      setCorrectionEnCours(null);
    }
  };

  if (soumissions.length === 0) {
    return (
      <Card>
        <div className="text-center py-10 text-gray-400">
          <Upload className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Aucune soumission pour l'instant</p>
          <p className="text-xs mt-1">Les élèves n'ont pas encore déposé de fichier</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {soumissions.map((s) => {
        const resultat = resultats[s.id] ?? s.resultatIA;
        const enCours = correctionEnCours === s.id;
        const mentionClass = MENTION_CLS[resultat?.mention] ?? 'bg-gray-100 text-gray-600';

        return (
          <Card key={s.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-indigo-600">
                    {s.eleve.prenom[0]}{s.eleve.nom[0]}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{s.eleve.nom} {s.eleve.prenom}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-500 truncate">{s.fichierNom}</span>
                    <span className="text-xs text-gray-400">({(s.taille / 1024).toFixed(0)} Ko)</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(s.createdAt), "d MMM yyyy 'à' HH'h'mm", { locale: fr })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {resultat && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${mentionClass}`}>
                    {resultat.noteGlobale}/{resultat.noteMax} — {resultat.mention}
                  </span>
                )}
                {s.corrigeeIA ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <button
                    onClick={() => corrigerIA(s.id)}
                    disabled={enCours}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {enCours ? <Spinner size="sm" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {enCours ? 'Correction…' : 'Corriger IA'}
                  </button>
                )}
              </div>
            </div>

            {/* Détail résultat IA */}
            {resultat && (
              <div className="mt-3 pt-3 border-t border-gray-50 space-y-3">
                <p className="text-xs text-gray-500 italic">{resultat.appreciationGenerale}</p>
                {resultat.conseilsPrioritaires?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {resultat.conseilsPrioritaires.map((c, i) => (
                      <span key={i} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                )}

                {/* Bouton / panneau questions d'entretien */}
                {!questions[s.id] ? (
                  <button
                    onClick={() => genererQuestions(s.id, s.eleve, resultat)}
                    disabled={questionsEnCours === s.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {questionsEnCours === s.id ? <Spinner size="sm" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    {questionsEnCours === s.id ? 'Génération…' : 'Questions d\'entretien'}
                  </button>
                ) : (
                  <div className="border border-indigo-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setQuestionsOuvertes((p) => ({ ...p, [s.id]: !p[s.id] }))}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 transition-colors text-left"
                    >
                      <span className="flex items-center gap-2 text-xs font-semibold text-indigo-700">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Questions d'entretien ({questions[s.id]?.questions?.length ?? 0})
                      </span>
                      {questionsOuvertes[s.id]
                        ? <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
                        : <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                      }
                    </button>
                    {questionsOuvertes[s.id] && (
                      <div className="p-3 space-y-2">
                        {questions[s.id]?.questions?.map((q) => (
                          <div key={q.numero} className="bg-white border border-gray-100 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {q.numero}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${BLOOM_CLS[q.niveauBloom] ?? 'bg-gray-100 text-gray-600'}`}>
                                {BLOOM_LBL[q.niveauBloom] ?? q.niveauBloom}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-gray-800 mb-1">{q.question}</p>
                            <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">{q.elementsReponseAttendus}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ─── Compétences ciblées ─────────────────────────────────────────────────────
// Priorité : EvaluationCompetence (sélection explicite, groupées par pôle)
// Fallback : toutes les compétences de la matière de la séquence (ancien comportement)

function CompetencesCiblees({ evaluation }) {
  // Compétences sélectionnées explicitement (nouvelle feature)
  const explicites = (evaluation.competences ?? []).map((ec) => ec.competence);

  // Fallback : compétences de la matière de la séquence
  const fallback = evaluation.sequence?.matiere?.competences ?? [];

  const competences = explicites.length > 0 ? explicites : fallback;
  if (!competences.length) return null;

  const estExplicite = explicites.length > 0;

  // Regroupement par pôle (disponible uniquement pour les compétences explicites qui ont pole inclus)
  const polesMap = {};
  const sansPole = [];
  competences.forEach((c) => {
    if (estExplicite && c.pole) {
      if (!polesMap[c.pole.id]) polesMap[c.pole.id] = { pole: c.pole, comps: [] };
      polesMap[c.pole.id].comps.push(c);
    } else {
      sansPole.push(c);
    }
  });
  const poles = Object.values(polesMap).sort((a, b) => (a.pole.ordre ?? 0) - (b.pole.ordre ?? 0));

  const titre = estExplicite
    ? `Compétences évaluées — ${competences.length} sélectionnée${competences.length > 1 ? 's' : ''}`
    : `Compétences ciblées — ${evaluation.sequence?.matiere?.nom ?? ''} (${evaluation.sequence?.matiere?.code ?? ''})`;

  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><Target className="w-4 h-4 text-indigo-500" />{titre}</span>}
      />
      <div className="space-y-2 mt-1">
        {poles.map(({ pole, comps }) => (
          <div key={pole.id}>
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-1.5">
              <span className="font-mono bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">{pole.code}</span>
              {pole.titre}
            </p>
            <div className="flex flex-wrap gap-1.5 pl-4">
              {comps.map((c) => (
                <span key={c.id} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800">
                  <strong>{c.code}</strong> — {c.description}
                </span>
              ))}
            </div>
          </div>
        ))}
        {sansPole.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sansPole.map((c) => (
              <span key={c.id} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800">
                <strong>{c.code}</strong> — {c.description}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Tableau de correction unifié (enseignant) ───────────────────────────────

const MENTION_TC = {
  'Très Bien': 'text-green-600', 'Bien': 'text-blue-600',
  'Assez Bien': 'text-yellow-600', 'Passable': 'text-orange-600',
  'Insuffisant': 'text-red-600',
};

function TableauCorrection({ evaluationId, evaluation, grille, soumissions, onSauvegarder }) {
  const qc = useQueryClient();
  const [paliers, setPaliers]       = useState({});
  const [modifie, setModifie]       = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [corrigeEnCours, setCorrigeEnCours] = useState(new Set());
  const [questionsOuvertes, setQuestionsOuvertes] = useState({});
  const [questions, setQuestions]   = useState({});
  const [genEnCours, setGenEnCours] = useState(null);

  // Critères observables
  const [criteresObs, setCriteresObs]     = useState({});
  const [criteresCoches, setCriteresCoches] = useState({});

  const matiereId = evaluation.sequence?.matiere?.id;
  const { data: compData } = useQuery({
    queryKey: ['competences-criteres', matiereId],
    queryFn: () => api.get('/competences', { params: { matiereId, limite: 100 } }).then((r) => r.data),
    enabled: !!matiereId,
  });
  const competences = compData?.competences ?? [];
  const totalCriteres = competences.reduce((s, c) => s + (c.criteres?.length ?? 0), 0);

  const toggleCritere = (eleveId, critereId) => {
    setCriteresCoches((prev) => {
      const current = new Set(prev[eleveId] ?? []);
      current.has(critereId) ? current.delete(critereId) : current.add(critereId);
      return { ...prev, [eleveId]: new Set(current) };
    });
  };

  useEffect(() => {
    if (modifie) return;
    const map = {};
    grille.forEach(({ eleve, note }) => { map[eleve.id] = note?.valeur ?? null; });
    setPaliers(map);
  }, [grille, modifie]);

  const soumissionMap = Object.fromEntries(soumissions.map((s) => [s.eleve.id, s]));
  const nbNonCorrigees = soumissions.filter((s) => !s.corrigeeIA).length;

  const corrigerUn = async (soumissionId) => {
    setCorrigeEnCours((p) => new Set([...p, soumissionId]));
    try {
      await api.post(`/evaluations/${evaluationId}/soumissions/${soumissionId}/corriger-ia`);
      qc.invalidateQueries({ queryKey: ['evaluation', evaluationId, 'soumissions'] });
      qc.invalidateQueries({ queryKey: ['evaluation', evaluationId, 'notes'] });
    } catch (err) {
      alert(err?.response?.data?.message ?? 'Erreur IA');
    } finally {
      setCorrigeEnCours((p) => { const s = new Set(p); s.delete(soumissionId); return s; });
    }
  };

  const corrigerTout = async () => {
    for (const s of soumissions.filter((s) => !s.corrigeeIA)) {
      await corrigerUn(s.id);
    }
  };

  const telechargerFichier = async (soumissionId, fichierNom) => {
    try {
      const resp = await api.get(`/evaluations/${evaluationId}/soumissions/${soumissionId}/fichier`, { responseType: 'blob' });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fichierNom;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err?.response?.data?.message ?? 'Erreur lors du téléchargement');
    }
  };

  const genererQuestions = async (eleveId, resultatIA) => {
    if (questions[eleveId]) {
      setQuestionsOuvertes((p) => ({ ...p, [eleveId]: !p[eleveId] }));
      return;
    }
    setGenEnCours(eleveId);
    try {
      const contenu = [
        resultatIA.appreciationGenerale,
        ...(resultatIA.criteres ?? []).map((c) => `${c.nom} : ${c.justification}`),
      ].filter(Boolean).join('\n\n');
      const { data } = await api.post('/ia/questions-entretien', {
        contenuTravail: contenu,
        contexte: { nbQuestions: 5 },
      });
      setQuestions((p) => ({ ...p, [eleveId]: data.resultat?.questions ?? [] }));
      setQuestionsOuvertes((p) => ({ ...p, [eleveId]: true }));
    } catch (err) {
      alert(err?.response?.data?.message ?? 'Erreur questions');
    } finally {
      setGenEnCours(null);
    }
  };

  const choisirPalier = (eleveId, valeur) => {
    setPaliers((p) => ({ ...p, [eleveId]: valeur }));
    setModifie(true);
  };

  const handleSauvegarder = async () => {
    setSauvegarde(true);
    try {
      const notes = grille.map(({ eleve }) => ({ eleveId: eleve.id, valeur: paliers[eleve.id] }));
      await onSauvegarder(notes);
      setModifie(false);
    } finally {
      setSauvegarde(false);
    }
  };

  if (grille.length === 0) {
    return (
      <Card>
        <div className="text-center py-10 text-gray-400 text-sm">Aucun élève inscrit dans cette classe.</div>
      </Card>
    );
  }

  const PALIER_ENTREES = Object.entries(PALIERS_CFG);

  return (
    <div className="space-y-3">
      {/* En-tête : stats + boutons */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-4 text-sm text-gray-500">
          <span><strong className="text-gray-900">{grille.length}</strong> élève{grille.length > 1 ? 's' : ''}</span>
          <span><strong className="text-gray-900">{soumissions.length}</strong> fichier{soumissions.length > 1 ? 's' : ''} déposé{soumissions.length > 1 ? 's' : ''}</span>
          {soumissions.length > 0 && (
            <span><strong className="text-green-600">{soumissions.filter((s) => s.corrigeeIA).length}/{soumissions.length}</strong> corrigé{soumissions.filter((s) => s.corrigeeIA).length > 1 ? 's' : ''} IA</span>
          )}
        </div>
        <div className="flex gap-2">
          {nbNonCorrigees > 0 && evaluation.statut !== 'ARCHIVEE' && (
            <button
              onClick={corrigerTout}
              disabled={corrigeEnCours.size > 0}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {corrigeEnCours.size > 0 ? <Spinner size="sm" /> : <Sparkles className="w-4 h-4" />}
              {corrigeEnCours.size > 0 ? `Correction… (${corrigeEnCours.size})` : `Corriger tout (${nbNonCorrigees})`}
            </button>
          )}
          {modifie && (
            <button
              onClick={handleSauvegarder}
              disabled={sauvegarde}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {sauvegarde ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
              Sauvegarder
            </button>
          )}
        </div>
      </div>

      {/* Légende paliers */}
      <div className="flex flex-wrap gap-1.5 text-xs">
        {PALIER_ENTREES.map(([v, cfg]) => (
          <span key={v} className={`px-2 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.text}`}>
            {cfg.label} — {cfg.libelle}
          </span>
        ))}
      </div>

      {/* Lignes par élève */}
      <div className="space-y-2">
        {grille.map(({ eleve }) => {
          const soumission  = soumissionMap[eleve.id];
          const resultatIA  = soumission?.resultatIA;
          const palier      = paliers[eleve.id] ?? null;
          const enCours     = soumission && corrigeEnCours.has(soumission.id);
          const qOuverts    = questionsOuvertes[eleve.id];
          const qEleve      = questions[eleve.id];

          return (
            <Card key={eleve.id} padding={false}>
              <div className="p-4 space-y-2">
                {/* Ligne principale */}
                <div className="flex items-start gap-3 flex-wrap">
                  {/* Nom élève */}
                  <div className="w-36 font-semibold text-gray-900 flex-shrink-0 pt-1">
                    {eleve.nom} {eleve.prenom}
                  </div>

                  {/* Résultat IA / statut soumission */}
                  <div className="flex-1 min-w-0 pt-1">
                    {!soumission ? (
                      <span className="text-xs text-gray-400 italic">Pas de dépôt</span>
                    ) : enCours ? (
                      <span className="flex items-center gap-1.5 text-xs text-purple-600">
                        <Spinner size="sm" /> Correction IA en cours…
                      </span>
                    ) : soumission.corrigeeIA && resultatIA ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="font-bold text-gray-900">{resultatIA.noteGlobale}/{resultatIA.noteMax}</span>
                        <span className={`text-xs font-semibold ${MENTION_TC[resultatIA.mention] ?? 'text-gray-600'}`}>
                          {resultatIA.mention}
                        </span>
                        <button
                          onClick={() => telechargerFichier(soumission.id, soumission.fichierNom)}
                          title={`Télécharger ${soumission.fichierNom}`}
                          className="p-1 text-gray-400 hover:text-indigo-600 flex-shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-500 truncate max-w-[160px]">{soumission.fichierNom}</span>
                        <button
                          onClick={() => telechargerFichier(soumission.id, soumission.fichierNom)}
                          title={`Télécharger ${soumission.fichierNom}`}
                          className="p-1 text-gray-400 hover:text-indigo-600 flex-shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {evaluation.statut !== 'ARCHIVEE' && (
                          <button
                            onClick={() => corrigerUn(soumission.id)}
                            className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded text-xs font-medium flex-shrink-0"
                          >
                            <Sparkles className="w-3 h-3" /> Corriger IA
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Palier + boutons critères / entretien */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    <div className="flex gap-1">
                      {PALIER_ENTREES.map(([v, cfg]) => {
                        const val  = v === 'null' ? null : Number(v);
                        const actif = palier === val;
                        return (
                          <button
                            key={v}
                            onClick={() => evaluation.statut !== 'ARCHIVEE' && choisirPalier(eleve.id, val)}
                            disabled={evaluation.statut === 'ARCHIVEE'}
                            title={cfg.libelle}
                            className={[
                              'w-8 h-7 rounded text-xs font-bold border-2 transition-all select-none',
                              actif
                                ? `${cfg.btnCls} ring-2 ring-offset-1 ring-current shadow-sm`
                                : 'bg-white text-gray-300 border-gray-200 hover:border-gray-300',
                            ].join(' ')}
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Bouton critères observables */}
                    {competences.length > 0 && (
                      <button
                        onClick={() => setCriteresObs((p) => ({ ...p, [eleve.id]: !p[eleve.id] }))}
                        title="Critères observables"
                        className={[
                          'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0',
                          criteresObs[eleve.id]
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600',
                        ].join(' ')}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {criteresCoches[eleve.id]?.size > 0 && (
                          <span className="bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">
                            {criteresCoches[eleve.id].size}
                          </span>
                        )}
                      </button>
                    )}

                    {soumission?.corrigeeIA && resultatIA && (
                      <button
                        onClick={() => genererQuestions(eleve.id, resultatIA)}
                        disabled={genEnCours === eleve.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium flex-shrink-0"
                        title="Questions d'entretien IA"
                      >
                        {genEnCours === eleve.id ? <Spinner size="sm" /> : <MessageSquare className="w-3.5 h-3.5" />}
                        Entretien
                      </button>
                    )}
                  </div>
                </div>

                {/* Critères observables (dépliable) */}
                {criteresObs[eleve.id] && competences.length > 0 && (
                  <div className="pt-3 border-t border-gray-100 space-y-3">
                    <p className="text-xs font-semibold text-emerald-700 flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5" />
                      Critères observables
                      <span className="text-gray-400 font-normal">
                        — cochez les critères observés chez {eleve.prenom}
                        {totalCriteres > 0 && (
                          <span className="ml-1 font-semibold text-emerald-600">
                            ({criteresCoches[eleve.id]?.size ?? 0}/{totalCriteres})
                          </span>
                        )}
                      </span>
                    </p>
                    {competences.map((comp) => {
                      const cochesComp = (comp.criteres ?? []).filter(
                        (c) => criteresCoches[eleve.id]?.has(c.id)
                      ).length;
                      return (
                        <div key={comp.id}>
                          <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1.5 flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                              {comp.code}
                            </span>
                            <span className="text-gray-700 font-medium">{comp.description}</span>
                            <span className="text-gray-400 font-normal ml-auto">
                              {cochesComp}/{comp.criteres?.length ?? 0} observés
                            </span>
                          </p>
                          {(comp.criteres?.length ?? 0) === 0 ? (
                            <p className="text-xs text-gray-400 pl-2 italic">Aucun critère défini</p>
                          ) : (
                            <div className="space-y-1 pl-2 border-l-2 border-indigo-100">
                              {comp.criteres.map((critere) => {
                                const coche = criteresCoches[eleve.id]?.has(critere.id) ?? false;
                                return (
                                  <label
                                    key={critere.id}
                                    className={`flex items-start gap-2 cursor-pointer p-1.5 rounded-lg transition-colors ${
                                      coche ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'hover:bg-gray-50'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={coche}
                                      onChange={() => toggleCritere(eleve.id, critere.id)}
                                      className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 flex-shrink-0"
                                    />
                                    <span className={`text-xs leading-relaxed ${
                                      coche ? 'text-emerald-800 dark:text-emerald-300 font-medium' : 'text-gray-500'
                                    }`}>
                                      {critere.description}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Résumé / détail IA — affiché automatiquement dès que la correction IA est disponible */}
                {resultatIA && (
                  <div className="pt-3 border-t border-gray-100">
                    <AffichageResultatIA
                      resultat={resultatIA}
                      palier={paliers[eleve.id] ?? null}
                      compact={true}
                    />
                  </div>
                )}

                {/* Questions d'entretien (dépliable) */}
                {qOuverts && qEleve?.length > 0 && (
                  <div className="pt-2 border-t border-gray-100 space-y-1.5">
                    <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {qEleve.length} questions d'entretien
                    </p>
                    {qEleve.map((q, i) => (
                      <div key={i} className="bg-indigo-50/60 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-gray-800">{q.numero}. {q.question}</p>
                        {q.elementsReponseAttendus && (
                          <p className="text-xs text-gray-500 mt-0.5">{q.elementsReponseAttendus}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Menu statut (enseignant) ─────────────────────────────────────────────────

function MenuStatut({ evaluation, onChanger }) {
  const [ouvert, setOuvert] = useState(false);
  const statuts = ['BROUILLON', 'PUBLIEE', 'CORRIGEE', 'ARCHIVEE'].filter((s) => s !== evaluation.statut);

  return (
    <div className="relative">
      <button
        onClick={() => setOuvert((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Badge value={evaluation.statut} />
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>
      {ouvert && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-10 py-1 min-w-[160px]">
          {statuts.map((s) => (
            <button
              key={s}
              onClick={() => { onChanger(s); setOuvert(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 text-sm"
            >
              <Badge value={s} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function EvaluationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const qc = useQueryClient();
  const [erreurSauvegarde, setErreurSauvegarde] = useState(null);

  const estEnseignant = ['ADMIN', 'ENSEIGNANT'].includes(utilisateur?.role);
  const estEleve = utilisateur?.role === 'ELEVE';

  const { data, isLoading, error } = useQuery({
    queryKey: ['evaluation', id, 'notes'],
    queryFn: () => api.get(`/evaluations/${id}/notes`).then((r) => r.data),
  });

  const { data: soumissions = [] } = useQuery({
    queryKey: ['evaluation', id, 'soumissions'],
    queryFn: () => api.get(`/evaluations/${id}/soumissions`).then((r) => r.data),
    enabled: estEnseignant,
    // Polling pour que l'enseignant voit apparaître les nouveaux dépôts
    refetchInterval: estEnseignant ? 30000 : false,
  });

  const { data: maSoumission } = useQuery({
    queryKey: ['evaluation', id, 'ma-soumission'],
    queryFn: () => api.get(`/evaluations/${id}/soumissions/ma-soumission`).then((r) => r.data),
    enabled: estEleve,
    // Polling toutes les 15 s tant que la soumission n'est pas encore corrigée
    refetchInterval: (query) =>
      query.state.data?.corrigeeIA === false ? 15000 : false,
  });

  const changerStatut = useMutation({
    mutationFn: (statut) => api.patch(`/evaluations/${id}/statut`, { statut }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluation', id, 'notes'] });
      qc.invalidateQueries({ queryKey: ['evaluations'] });
    },
  });

  const sauvegarderNotes = async (notes) => {
    setErreurSauvegarde(null);
    try {
      await api.post(`/evaluations/${id}/notes`, { notes });
      qc.invalidateQueries({ queryKey: ['evaluation', id, 'notes'] });
    } catch (err) {
      setErreurSauvegarde(err?.response?.data?.message ?? 'Erreur lors de la sauvegarde');
      throw err;
    }
  };

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error || !data) return (
    <div className="text-center py-16 text-gray-400">
      <p>Évaluation introuvable.</p>
      <button onClick={() => navigate('/evaluations')} className="mt-2 text-indigo-600 text-sm hover:underline">
        Retour aux évaluations
      </button>
    </div>
  );

  const { evaluation, grille, stats } = data;

  // Vue élève : chercher sa propre ligne dans la grille
  const monEntree = estEleve ? grille.find((g) => g.eleve.id === utilisateur.id) : null;

  return (
    <div className="space-y-6">
      {/* Fil d'Ariane */}
      <button
        onClick={() => navigate('/evaluations')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="w-4 h-4" /> Toutes les évaluations
      </button>

      {/* En-tête */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{evaluation.titre}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge value={evaluation.statut} />
              <Badge value={evaluation.type} label={TYPE_LABELS[evaluation.type]} />
              <span className="text-sm text-gray-500">{evaluation.classe?.nom}</span>
              {evaluation.datePassage && (
                <span className="text-sm text-gray-400">
                  · {format(new Date(evaluation.datePassage), 'dd MMMM yyyy', { locale: fr })}
                </span>
              )}
            </div>
            {evaluation.description && (
              <p className="mt-2 text-sm text-gray-500 line-clamp-2">{evaluation.description}</p>
            )}
          </div>
          {estEnseignant && (
            <MenuStatut evaluation={evaluation} onChanger={(s) => changerStatut.mutate(s)} />
          )}
        </div>

        {/* Stats rapides */}
        <div className="flex gap-6 mt-4 pt-4 border-t border-gray-50">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{grille.length}</p>
            <p className="text-xs text-gray-400">élève{grille.length !== 1 ? 's' : ''}</p>
          </div>
          {estEnseignant && (
            <>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{stats.nbSaisies}</p>
                <p className="text-xs text-gray-400">évalué{stats.nbSaisies !== 1 ? 's' : ''}</p>
              </div>
              {stats.moyenne !== null && (
                <div className="text-center">
                  <p className="text-lg font-bold text-indigo-600">{stats.moyenne}/4</p>
                  <p className="text-xs text-gray-400">palier moyen</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{soumissions.length}</p>
                <p className="text-xs text-gray-400">soumission{soumissions.length !== 1 ? 's' : ''}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── Vue Enseignant ─── */}
      {estEnseignant && (
        <>
          <SujetPanel evaluationId={id} peutGerer={true} />

          {(evaluation.competences?.length > 0 || evaluation.sequence?.matiere?.competences?.length > 0) && (
            <CompetencesCiblees evaluation={evaluation} />
          )}

          {erreurSauvegarde && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {erreurSauvegarde}
            </div>
          )}

          <TableauCorrection
            evaluationId={id}
            evaluation={evaluation}
            grille={grille}
            soumissions={soumissions}
            onSauvegarder={sauvegarderNotes}
          />
        </>
      )}

      {/* ─── Vue Élève ─── */}
      {estEleve && (
        <div className="space-y-6">
          {/* Statut du devoir */}
          <StatutDevoir evaluationId={id} maSoumission={maSoumission} />

          {/* Résultat de correction IA */}
          {maSoumission?.corrigeeIA && maSoumission?.resultatIA && (
            <ResultatCorrection
              resultat={maSoumission.resultatIA}
              palierEnseignant={monEntree?.note?.valeur ?? null}
            />
          )}

          {/* Palier enseignant seul (sans correction IA) */}
          {!(maSoumission?.corrigeeIA) && monEntree?.note?.valeur != null && (
            <Card>
              <CardHeader
                title={<span className="flex items-center gap-2"><Target className="w-4 h-4 text-indigo-500" />Mon évaluation</span>}
                subtitle="Palier attribué par l'enseignant"
              />
              <div className="flex justify-center py-4">
                <PalierBadge valeur={monEntree.note.valeur} taille="lg" />
              </div>
            </Card>
          )}

          {/* Énoncé — lecture seule */}
          <SujetPanel evaluationId={id} peutGerer={false} />

          {/* Dépôt du devoir */}
          {evaluation.statut !== 'ARCHIVEE' && (
            <UploadDevoir evaluationId={id} maSoumission={maSoumission} />
          )}
        </div>
      )}
    </div>
  );
}
