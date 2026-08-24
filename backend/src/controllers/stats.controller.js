import { statsGlobales } from '../services/stats.service.js';

export const obtenirStats = async (req, res, next) => {
  try {
    res.json(await statsGlobales());
  } catch (err) {
    next(err);
  }
};
