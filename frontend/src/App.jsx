import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { FullPageSpinner } from './components/ui/Spinner.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import Login from './pages/Login.jsx';
import ReinitialiserMotDePasse from './pages/ReinitialiserMotDePasse.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Classes from './pages/Classes.jsx';
import ClasseDetail from './pages/ClasseDetail.jsx';
import Evaluations from './pages/Evaluations.jsx';
import EvaluationDetail from './pages/EvaluationDetail.jsx';
import Competences from './pages/Competences.jsx';
import AssistantIA from './pages/AssistantIA.jsx';
import ImportReferentiel from './pages/ImportReferentiel.jsx';
import Bulletins from './pages/Bulletins.jsx';
import Users from './pages/Users.jsx';
import Annees from './pages/Annees.jsx';
import Documentation from './pages/Documentation.jsx';
import Notes from './pages/Notes.jsx';
import Sequences from './pages/Sequences.jsx';
import SequenceDetail from './pages/SequenceDetail.jsx';
import MonPortfolio from './pages/MonPortfolio.jsx';
import Certification from './pages/Certification.jsx';
import Pfmp from './pages/Pfmp.jsx';
import PfmpDetail from './pages/PfmpDetail.jsx';
import Ccf from './pages/Ccf.jsx';
import CcfDetail from './pages/CcfDetail.jsx';
import Absences from './pages/Absences.jsx';

function ProtectedRoute({ children }) {
  const { utilisateur, chargement } = useAuth();
  if (chargement) return <FullPageSpinner />;
  if (!utilisateur) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { utilisateur, chargement } = useAuth();
  if (chargement) return <FullPageSpinner />;
  if (!utilisateur) return <Navigate to="/login" replace />;
  if (utilisateur.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { utilisateur, chargement } = useAuth();
  if (chargement) return <FullPageSpinner />;
  if (utilisateur) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/reinitialiser-mot-de-passe" element={<ReinitialiserMotDePasse />} />

      <Route
        path="/"
        element={<ProtectedRoute><AppLayout /></ProtectedRoute>}
      >
        <Route index element={<Dashboard />} />

        {/* Classes */}
        <Route path="classes" element={<Classes />} />
        <Route path="classes/:id" element={<ClasseDetail />} />

        {/* Évaluations */}
        <Route path="evaluations" element={<Evaluations />} />
        <Route path="evaluations/:id" element={<EvaluationDetail />} />

        {/* Compétences */}
        <Route path="competences" element={<Competences />} />

        {/* Situations pro (IA) */}
        <Route path="ia" element={<AssistantIA />} />

        {/* Référentiel & Bilan certification */}
        <Route path="import-referentiel" element={<ImportReferentiel />} />
        <Route path="bulletins" element={<Bulletins />} />

        {/* Documentation */}
        <Route path="documentation" element={<Documentation />} />

        {/* Notes */}
        <Route path="notes" element={<Notes />} />

        {/* Séquences pédagogiques */}
        <Route path="sequences"     element={<Sequences />} />
        <Route path="sequences/:id" element={<SequenceDetail />} />

        {/* Espace élève */}
        <Route path="mon-portfolio" element={<MonPortfolio />} />

        {/* Certification (radar par pôle + grille + export, adapté au rôle) */}
        <Route path="certification" element={<Certification />} />

        {/* PFMP (stages en entreprise) */}
        <Route path="pfmps"     element={<Pfmp />} />
        <Route path="pfmps/:id" element={<PfmpDetail />} />

        {/* CCF (contrôle en cours de formation) */}
        <Route path="ccf"     element={<Ccf />} />
        <Route path="ccf/:id" element={<CcfDetail />} />

        {/* Absences */}
        <Route path="absences" element={<Absences />} />

        {/* Administration (ADMIN uniquement) */}
        <Route path="users"    element={<AdminRoute><Users /></AdminRoute>} />
        <Route path="annees"   element={<AdminRoute><Annees /></AdminRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
