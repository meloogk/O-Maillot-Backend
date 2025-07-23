import { LigueSchemaModel } from '../models/Ligue.model.mjs';

export const getLigues = async (req, res) => {
  try {
    const { search, pays } = req.query;

    const query = {};
    if (search) query.nom = { $regex: search, $options: 'i' };
    if (pays) query.pays = { $regex: pays, $options: 'i' };

    const ligues = await LigueSchemaModel.find(query).lean();
    res.status(200).json([{ _id: 'all', nom: 'Toutes les ligues' }, ...ligues]);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const getLigueById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de ligue invalide' });
    }
    const ligue = await LigueSchemaModel.findById(id).lean();
    if (!ligue) return res.status(404).json({ message: 'Ligue non trouvée' });
    res.status(200).json(ligue);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};