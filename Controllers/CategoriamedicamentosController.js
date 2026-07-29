import { CategoriaMedicamentoModel } from '../Models/index.js';

export const CategoriamedicamentosController = {
    index: async (req, res) => {
        try {
            const datos = await CategoriaMedicamentoModel.findAll();

            if (datos.length !== 0) {
                return res.status(200).json({ result: datos });
            } else {
                return res.status(200).json({ mensaje: "No existen datos registrados", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
};