import { EquipeSchemaModel } from '../models/Equipe.model.mjs';
import { LigueSchemaModel } from '../models/Ligue.model.mjs';

export const getEquipes = async (req, res) => {
  try {
    const { search, ligue, pays } = req.query;

    const query = {};
    if (search) query.nom = { $regex: search, $options: 'i' };
    if (ligue) {
      if (!mongoose.Types.ObjectId.isValid(ligue)) {
        return res.status(400).json({ message: 'ID de ligue invalide' });
      }
      const ligueExists = await LigueSchemaModel.findById(ligue).lean();
      if (!ligueExists) return res.status(404).json({ message: 'Ligue non trouvée' });
      query.ligue = ligue;
    }
    if (pays) query.pays = { $regex: pays, $options: 'i' };

    const equipes = await EquipeSchemaModel.find(query).lean();
    res.status(200).json(equipes);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const getEquipeById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID d\'équipe invalide' });
    }
    const equipe = await EquipeSchemaModel.findById(id).lean();
    if (!equipe) return res.status(404).json({ message: 'Équipe non trouvée' });
    res.status(200).json(equipe);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};