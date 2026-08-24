import * as portfolioService from '../services/portfolio.service.js';

const rep = (res, fn) => fn.then((data) => res.json(data)).catch((err) => {
  res.status(err.status || 500).json({ message: err.message });
});

export const monPortfolio = (req, res) =>
  rep(res, portfolioService.obtenirPortfolio(req.utilisateur.id));

export const portfolioEleve = (req, res) =>
  rep(res, portfolioService.obtenirPortfolio(req.params.eleveId));

export const mesCompetencesFragiles = (req, res) =>
  rep(res, portfolioService.obtenirCompetencesFragiles(req.utilisateur.id));

export const competencesFragilesEleve = (req, res) =>
  rep(res, portfolioService.obtenirCompetencesFragiles(req.params.eleveId));
