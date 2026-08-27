import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, CheckCircle2, Sparkles, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import api from '../../services/api.js';
import Card, { CardHeader } from '../ui/Card.jsx';
import Spinner from '../ui/Spinner.jsx';

const MENTION_COULEURS = {
  'Insuffisant':  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  'Passable':     'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'Assez Bien':   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Bien':         'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'Très Bien':    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};

function ResultatIA({ resultat }) {
  const [ouvert, setOuvert] = useState(true);
  if (!resultat) return null;

  const mentionClass = MENTION_COULEURS[resultat.mention] ?? 'bg-gray-100 text-gray-700';
  const pct = resultat.noteMax > 0 ? Math.round((resultat.noteGlobale / resultat.noteMax) * 100) : 0;

  return (
    <div className="mt-4 rounded-xl border border-indigo-100 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20 overflow-hidden">
      <button
        onClick={() => setOuvert((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Correction</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${mentionClass}`}>{resultat.mention}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-900">{resultat.noteGlobale}/{resultat.noteMax}</span>
          {ouvert ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {ouvert && (
        <div className="px-4 pb-4 space-y-4">
          {/* Barre de progression */}
          <div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{pct}% des points</p>
          </div>

          {/* Appréciation */}
          {resultat.appreciationGenerale && (
            <p className="text-sm text-gray-700 italic">{resultat.appreciationGenerale}</p>
          )}

          {/* Détail par critère */}
          {resultat.criteres?.length > 0 && (
            <div className="space-y-2">
              {resultat.criteres.map((c, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-100 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">{c.nom}</span>
                    <span className="text-xs font-bold text-gray-900">{c.noteObtenue}/{c.noteMax}</span>
                  </div>
                  <p className="text-xs text-gray-500">{c.justification}</p>
                </div>
              ))}
            </div>
          )}

          {/* Conseils */}
          {resultat.conseilsPrioritaires?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Axes de progrès</p>
              <ul className="space-y-1">
                {resultat.conseilsPrioritaires.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                    <span className="text-indigo-400 mt-0.5">•</span>{c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function UploadDevoir({ evaluationId, maSoumission }) {
  const qc = useQueryClient();
  const inputRef = useRef();
  const [fichier, setFichier] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const upload = useMutation({
    mutationFn: (formData) =>
      // Content-Type: undefined → le navigateur définit multipart/form-data avec le bon boundary
      api.post(`/evaluations/${evaluationId}/soumissions`, formData, {
        headers: { 'Content-Type': undefined },
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluation', evaluationId, 'ma-soumission'] });
      setFichier(null);
    },
  });

  const handleFichier = (f) => {
    if (!f) return;
    const exts = ['.doc', '.docx', '.xls', '.xlsx'];
    if (!exts.some((e) => f.name.toLowerCase().endsWith(e))) {
      alert('Seuls les fichiers Word (.doc, .docx) et Excel (.xls, .xlsx) sont acceptés.');
      return;
    }
    setFichier(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFichier(e.dataTransfer.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fichier) return;
    const fd = new FormData();
    fd.append('fichier', fichier);
    upload.mutate(fd);
  };

  const dejaDepose = !!maSoumission;

  return (
    <Card>
      <CardHeader
        title="Déposer mon devoir"
        subtitle="Formats acceptés : Word (.doc, .docx) et Excel (.xls, .xlsx)"
      />

      {/* Statut soumission existante */}
      {dejaDepose && (
        <div className="mb-4 flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Devoir déposé</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{maSoumission.fichierNom}</p>
          </div>
        </div>
      )}

      {/* Zone de dépôt */}
      <form onSubmit={handleSubmit}>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={[
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            dragOver ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
          ].join(' ')}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={(e) => handleFichier(e.target.files[0])}
          />
          {fichier ? (
            <div className="flex flex-col items-center gap-2">
              <FileText className="w-10 h-10 text-indigo-500" />
              <p className="text-sm font-medium text-gray-900">{fichier.name}</p>
              <p className="text-xs text-gray-400">{(fichier.size / 1024).toFixed(0)} Ko</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Upload className="w-10 h-10" />
              <p className="text-sm font-medium">Cliquez ou glissez votre fichier ici</p>
              <p className="text-xs">Word ou Excel — 10 Mo max</p>
            </div>
          )}
        </div>

        {/* Erreur upload */}
        {upload.isError && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {upload.error?.response?.data?.message ?? 'Erreur lors du dépôt'}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={!fichier || upload.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {upload.isPending ? <Spinner size="sm" /> : <Upload className="w-4 h-4" />}
            {dejaDepose ? 'Remplacer le devoir' : 'Déposer le devoir'}
          </button>
        </div>
      </form>

      {/* Résultat IA si disponible */}
      {maSoumission?.corrigeeIA && maSoumission?.resultatIA && (
        <ResultatIA resultat={maSoumission.resultatIA} />
      )}
    </Card>
  );
}
