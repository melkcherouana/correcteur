import { useState } from 'react';
import { User, AtSign, Mail, School, BookOpen, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import Spinner from '../components/ui/Spinner.jsx';

const LIBELLES_ROLE = { ADMIN: 'Administrateur', ENSEIGNANT: 'Enseignant', ELEVE: 'Élève' };

const FORM_VIDE = { ancienMotDePasse: '', nouveauMotDePasse: '', confirmation: '' };

function LigneInfo({ icon: Icon, label, valeur }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 break-words">{valeur || '—'}</p>
      </div>
    </div>
  );
}

function ChampMotDePasse({ id, label, value, onChange, visible, autoComplete }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        id={id}
        name={id}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder="••••••••"
        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
      />
    </div>
  );
}

export default function MonProfil() {
  const { utilisateur } = useAuth();

  const [form, setForm] = useState(FORM_VIDE);
  const [visible, setVisible] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState(false);
  const [chargement, setChargement] = useState(false);

  const classe = utilisateur?.classe?.classe;
  const matieres = utilisateur?.matieres?.map((m) => m.matiere.nom) ?? [];

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (erreur) setErreur('');
    if (succes) setSucces(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Vérifications côté client (le serveur refait les mêmes contrôles)
    if (!form.ancienMotDePasse) {
      setErreur("Saisissez votre ancien mot de passe.");
      return;
    }
    if (form.nouveauMotDePasse.length < 8) {
      setErreur('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (form.nouveauMotDePasse !== form.confirmation) {
      setErreur('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }
    setChargement(true);
    setErreur('');
    try {
      await api.put('/auth/mot-de-passe', form);
      setSucces(true);
      setForm(FORM_VIDE);
    } catch (err) {
      setErreur(
        err.response?.data?.erreurs?.[0]?.msg
          ?? err.response?.data?.message
          ?? 'Une erreur est survenue.'
      );
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-sm text-gray-500 mt-1">Vos informations personnelles et votre mot de passe</p>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-base font-bold text-white">
              {utilisateur?.prenom?.[0]}{utilisateur?.nom?.[0]}
            </span>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{utilisateur?.prenom} {utilisateur?.nom}</p>
            <p className="text-sm text-gray-500">{LIBELLES_ROLE[utilisateur?.role] ?? utilisateur?.role}</p>
          </div>
        </div>

        <LigneInfo icon={User} label="Nom" valeur={utilisateur?.nom} />
        <LigneInfo icon={User} label="Prénom" valeur={utilisateur?.prenom} />
        <LigneInfo icon={AtSign} label="Identifiant de connexion" valeur={utilisateur?.identifiant} />
        <LigneInfo icon={Mail} label="Email" valeur={utilisateur?.email || 'Non renseigné'} />
        {utilisateur?.role === 'ELEVE' && (
          <LigneInfo
            icon={School}
            label="Classe"
            valeur={classe ? `${classe.nom} (${classe.annee})` : 'Aucune classe affectée'}
          />
        )}
        {utilisateur?.role === 'ENSEIGNANT' && (
          <LigneInfo icon={BookOpen} label="Matières enseignées" valeur={matieres.join(', ')} />
        )}
      </Card>

      <Card>
        <CardHeader
          title="Changer mon mot de passe"
          subtitle="8 caractères minimum"
          action={
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
            >
              {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {visible ? 'Masquer' : 'Afficher'}
            </button>
          }
        />

        {erreur && (
          <div className="mb-4 flex items-start gap-2 bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-lg border border-red-100">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{erreur}</span>
          </div>
        )}
        {succes && (
          <div className="mb-4 flex items-start gap-2 bg-emerald-50 text-emerald-700 text-sm px-3 py-2.5 rounded-lg border border-emerald-100">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Mot de passe modifié avec succès.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <ChampMotDePasse
            id="ancienMotDePasse"
            label="Ancien mot de passe"
            value={form.ancienMotDePasse}
            onChange={handleChange}
            visible={visible}
            autoComplete="current-password"
          />
          <ChampMotDePasse
            id="nouveauMotDePasse"
            label="Nouveau mot de passe"
            value={form.nouveauMotDePasse}
            onChange={handleChange}
            visible={visible}
            autoComplete="new-password"
          />
          <ChampMotDePasse
            id="confirmation"
            label="Confirmer le nouveau mot de passe"
            value={form.confirmation}
            onChange={handleChange}
            visible={visible}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={chargement}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            {chargement ? <Spinner size="sm" className="border-white border-t-indigo-300" /> : <KeyRound className="w-4 h-4" />}
            {chargement ? 'Enregistrement…' : 'Changer le mot de passe'}
          </button>
        </form>
      </Card>
    </div>
  );
}
