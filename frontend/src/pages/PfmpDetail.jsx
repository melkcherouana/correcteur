import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ChevronLeft, Building2, User, Calendar, CheckCircle2,
  Pencil, Save, Loader2, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';

const NIVEAUX = ['NON_ACQUIS', 'EN_COURS', 'ACQUIS', 'DEPASSE'];
const NIV_LABEL = { NON_ACQUIS: 'Non acquis', EN_COURS: 'En cours', ACQUIS: 'Acquis', DEPASSE: 'Dépassé' };
const NIV_COULEUR = {
  NON_ACQUIS: 'bg-red-100 text-red-700 border-red-200',
  EN_COURS:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  ACQUIS:     'bg-green-100 text-green-700 border-green-200',
  DEPASSE:    'bg-indigo-100 text-indigo-700 border-indigo-200',
};
const STATUT_LABEL = { PLANIFIEE: 'Planifiée', EN_COURS: 'En cours', TERMINEE: 'Terminée', VALIDEE: 'Validée' };

// ─── Sélecteur de niveau ──────────────────────────────────────────────────────

function SelectNiveau({ valeur, onChange, lectureSeule }) {
  if (lectureSeule) {
    return valeur
      ? <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${NIV_COULEUR[valeur]}`}>{NIV_LABEL[valeur]}</span>
      : <span className="text-xs text-slate-400">—</span>;
  }
  return (
    <select value={valeur ?? ''}
      onChange={e => onChange(e.target.value || null)}
      className="text-xs border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500">
      <option value="">—</option>
      {NIVEAUX.map(n => <option key={n} value={n}>{NIV_LABEL[n]}</option>)}
    </select>
  );
}

// ─── Section infos ────────────────────────────────────────────────────────────

function InfoItem({ label, valeur }) {
  if (!valeur) return null;
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800 mt-0.5">{valeur}</p>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function PfmpDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const qc = useQueryClient();
  const estEnseignant = ['ENSEIGNANT', 'ADMIN'].includes(utilisateur?.role);

  const [competencesEd, setCompetencesEd] = useState(null); // null = non modifié
  const [modeEdit, setModeEdit]           = useState(false);
  const [appEns, setAppEns]               = useState('');
  const [erreur, setErreur]               = useState('');

  const { data: pfmp, isLoading } = useQuery({
    queryKey: ['pfmp', id],
    queryFn: () => api.get(`/pfmps/${id}`).then(r => r.data),
    onSuccess: (d) => {
      setAppEns(d.appreciationEnseignant ?? '');
    },
  });

  const { data: competencesDispo = [] } = useQuery({
    queryKey: ['competences-pfmp', pfmp?.classeId],
    queryFn: () => api.get(`/pfmps/competences/${pfmp.classeId}`).then(r => r.data),
    enabled: !!pfmp?.classeId && estEnseignant,
  });

  // Compétences éditables (snapshot du JSON ou liste fraîche)
  const competencesActuelles = competencesEd ?? (pfmp?.competencesEvaluees ?? []);

  const mutEvaluer = useMutation({
    mutationFn: (comps) => api.put(`/pfmps/${id}/evaluer`, { competencesEvaluees: comps }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pfmp', id] });
      setCompetencesEd(null);
      setModeEdit(false);
      setErreur('');
    },
    onError: (e) => setErreur(e.response?.data?.message ?? 'Erreur'),
  });

  const mutModifier = useMutation({
    mutationFn: (data) => api.put(`/pfmps/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pfmp', id] }),
    onError: (e) => setErreur(e.response?.data?.message ?? 'Erreur'),
  });

  const mutValider = useMutation({
    mutationFn: () => api.put(`/pfmps/${id}/valider`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pfmp', id] }),
    onError: (e) => setErreur(e.response?.data?.message ?? 'Erreur'),
  });

  const setNiveauComp = (competenceId, champ, niveau) => {
    const base = competencesEd ?? (pfmp?.competencesEvaluees ?? []);
    const existant = base.find(c => c.competenceId === competenceId);
    if (existant) {
      setCompetencesEd(base.map(c => c.competenceId === competenceId ? { ...c, [champ]: niveau } : c));
    } else {
      const comp = competencesDispo.find(c => c.id === competenceId);
      setCompetencesEd([...base, {
        competenceId,
        code: comp?.code ?? '',
        description: comp?.description ?? '',
        [champ]: niveau,
      }]);
    }
  };

  const getNiveau = (competenceId, champ) =>
    competencesActuelles.find(c => c.competenceId === competenceId)?.[champ] ?? null;

  const sauvegarder = () => {
    const toSave = competencesEd ?? pfmp?.competencesEvaluees ?? [];
    mutEvaluer.mutate(toSave);
    if (appEns !== pfmp?.appreciationEnseignant) {
      mutModifier.mutate({ appreciationEnseignant: appEns });
    }
  };

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (!pfmp) return (
    <div className="text-center py-16 text-slate-400">
      <p>PFMP introuvable.</p>
      <button onClick={() => navigate('/pfmps')} className="mt-2 text-indigo-600 text-sm hover:underline">Retour</button>
    </div>
  );

  const estValidee  = pfmp.statut === 'VALIDEE';
  const lectureSeule = !estEnseignant || estValidee;

  const nbAcquis = competencesActuelles.filter(c =>
    c.niveauEnseignant === 'ACQUIS' || c.niveauEnseignant === 'DEPASSE'
  ).length;
  const progression = competencesActuelles.length > 0
    ? Math.round((nbAcquis / competencesActuelles.length) * 100)
    : 0;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Nav */}
      <button onClick={() => navigate('/pfmps')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ChevronLeft className="w-4 h-4" /> Toutes les PFMP
      </button>

      {/* En-tête */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-7 h-7 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 truncate">{pfmp.entrepriseNom}</h1>
              <p className="text-slate-500 text-sm">PFMP {pfmp.numero} — {pfmp.eleve.prenom} {pfmp.eleve.nom}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium
                  ${pfmp.statut === 'VALIDEE' ? 'bg-green-100 text-green-700' :
                    pfmp.statut === 'TERMINEE' ? 'bg-amber-100 text-amber-700' :
                    pfmp.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'}`}>
                  {STATUT_LABEL[pfmp.statut]}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(pfmp.dateDebut), 'd MMM', { locale: fr })} →{' '}
                  {format(new Date(pfmp.dateFin), 'd MMM yyyy', { locale: fr })}
                </span>
              </div>
            </div>
          </div>

          {estEnseignant && !estValidee && (
            <div className="flex gap-2 flex-shrink-0">
              {pfmp.statut === 'TERMINEE' && (
                <button onClick={() => mutValider.mutate()}
                  disabled={mutValider.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {mutValider.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Valider la PFMP
                </button>
              )}
              {!modeEdit ? (
                <button onClick={() => setModeEdit(true)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50">
                  <Pencil className="w-4 h-4" /> Évaluer
                </button>
              ) : (
                <button onClick={sauvegarder}
                  disabled={mutEvaluer.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {mutEvaluer.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer
                </button>
              )}
            </div>
          )}
        </div>

        {competencesActuelles.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500">Progression des compétences</span>
              <span className="text-xs font-bold text-indigo-700">{nbAcquis}/{competencesActuelles.length} acquises</span>
            </div>
            <ProgressBar value={progression} max={100} />
          </div>
        )}
      </div>

      {erreur && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {erreur}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Infos entreprise */}
        <Card>
          <CardHeader title="Entreprise" />
          <div className="space-y-3">
            <InfoItem label="Secteur" valeur={pfmp.entrepriseSecteur} />
            <InfoItem label="Adresse" valeur={pfmp.entrepriseAdresse} />
            <InfoItem label="Durée" valeur={pfmp.semaines ? `${pfmp.semaines} semaines` : null} />
          </div>
        </Card>

        {/* Tuteur */}
        <Card>
          <CardHeader title="Maître de stage" />
          {pfmp.tuteurNom || pfmp.tuteurEmail ? (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-slate-500" />
              </div>
              <div className="space-y-1">
                <InfoItem label="Nom" valeur={pfmp.tuteurNom} />
                <InfoItem label="Email" valeur={pfmp.tuteurEmail} />
                <InfoItem label="Téléphone" valeur={pfmp.tuteurTelephone} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Non renseigné</p>
          )}
        </Card>
      </div>

      {/* Grille de compétences */}
      <Card padding={false}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Évaluation des compétences</h2>
          {modeEdit && <span className="text-xs text-indigo-600 font-medium">Mode édition</span>}
        </div>

        {competencesDispo.length === 0 && competencesActuelles.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-400 text-center">
            Aucune compétence dans le référentiel.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Compétence</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tuteur</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Enseignant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(modeEdit ? competencesDispo : competencesActuelles.map(c =>
                  competencesDispo.find(cd => cd.id === c.competenceId) ?? { id: c.competenceId, code: c.code, description: c.description, matiere: null }
                )).map(comp => (
                  <tr key={comp.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3">
                      <span className="font-mono text-xs text-indigo-600 font-bold mr-2">{comp.code}</span>
                      <span className="text-slate-700">{comp.description}</span>
                      {comp.matiere && (
                        <span className="ml-2 text-xs text-slate-400">{comp.matiere.nom}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <SelectNiveau
                        valeur={getNiveau(comp.id, 'niveauTuteur')}
                        onChange={v => setNiveauComp(comp.id, 'niveauTuteur', v)}
                        lectureSeule={lectureSeule || !modeEdit}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <SelectNiveau
                        valeur={getNiveau(comp.id, 'niveauEnseignant')}
                        onChange={v => setNiveauComp(comp.id, 'niveauEnseignant', v)}
                        lectureSeule={lectureSeule || !modeEdit}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Appréciations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Appréciation du tuteur" />
          {pfmp.appreciationTuteur ? (
            <p className="text-sm text-slate-700 italic">"{pfmp.appreciationTuteur}"</p>
          ) : (
            <p className="text-sm text-slate-400">Non renseignée</p>
          )}
        </Card>

        <Card>
          <CardHeader title="Appréciation de l'enseignant" />
          {modeEdit ? (
            <textarea
              value={appEns}
              onChange={e => setAppEns(e.target.value)}
              rows={4}
              placeholder="Saisir une appréciation…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          ) : pfmp.appreciationEnseignant ? (
            <p className="text-sm text-slate-700 italic">"{pfmp.appreciationEnseignant}"</p>
          ) : (
            <p className="text-sm text-slate-400">Non renseignée</p>
          )}
        </Card>
      </div>
    </div>
  );
}
