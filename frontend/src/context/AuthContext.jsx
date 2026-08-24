import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(({ data }) => setUtilisateur(data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setChargement(false));
    } else {
      setChargement(false);
    }
  }, []);

  const connexion = async (email, motDePasse) => {
    const { data } = await api.post('/auth/login', { email, motDePasse });
    localStorage.setItem('token', data.token);
    setUtilisateur(data.utilisateur);
    return data.utilisateur;
  };

  const deconnexion = () => {
    localStorage.removeItem('token');
    setUtilisateur(null);
  };

  return (
    <AuthContext.Provider value={{ utilisateur, chargement, connexion, deconnexion }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
};
