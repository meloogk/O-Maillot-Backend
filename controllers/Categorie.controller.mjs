import { CategorieSchemaModel } from '../models/Categorie.model.mjs';
import { ProduitSchemaModel } from '../models/Produit.model.mjs';

export const getCategories = async (req, res) => {
  try {
    const { nom } = req.query;
    const query = nom && nom.length >= 2 ? { nom: { $regex: nom, $options: 'i' } } : {};

    const categories = await CategorieSchemaModel.find(query).lean();
    const counts = await ProduitSchemaModel.aggregate([
      { $group: { _id: '$catégorie', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map(c => [c._id.toString(), c.count]));

    const categoriesWithCount = categories.map(cat => ({
      ...cat,
      count: countMap[cat._id] || 0,
    }));

    res.status(200).json(categoriesWithCount);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const getCategorieById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de catégorie invalide' });
    }
    const categorie = await CategorieSchemaModel.findById(id).lean();
    if (!categorie) return res.status(404).json({ message: 'Catégorie non trouvée' });

    const count = await ProduitSchemaModel.countDocuments({ catégorie: id });
    res.status(200).json({ ...categorie, count });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};