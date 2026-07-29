import { LaboratorioModel } from '../Models/index.js';

export const LaboratoriosController = {
    // GET /laboratorios
    index: async (req, res) => {
        try {
            const datos = await LaboratorioModel.findAll();

            if (datos.length !== 0) {
                return res.json({ result: datos });
            } else {
                return res.json({ mensaje: "No existen datos registrados", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    // POST /laboratorios
    store: async (req, res) => {
        try {
            const { nombre, descripcion } = req.body;

            const nuevoLaboratorio = await LaboratorioModel.create({
                nombre,
                descripcion,
                estado: true
            });

            return res.json({
                result: "Datos guardados",
                code: '201',
                id: nuevoLaboratorio.id_laboratorio
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
};