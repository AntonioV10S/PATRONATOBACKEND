import { FamiliarModel } from '../Models/index.js';

export const FamiliaController = {

    // GET /familia
    index: async (req, res) => {
        try {
            const datos = await FamiliarModel.findAll();
            if (datos.length !== 0) {
                return res.json({ result: datos });
            } else {
                return res.json({ mensaje: "No hay registros", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error en el servidor", error: error.message });
        }
    },

    // POST /familia
    store: async (req, res) => {
        try {
            const { nombres, union, vida, causas } = req.body;

            const datos = await FamiliarModel.create({
                nombres,
                union,
                vida,
                causes: causas // Tu script SQL especifica la columna como 'causes'
            });

            return res.json({
                result: "Datos guardados",
                code: '201',
                id: datos.id_familiar
            });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al guardar", error: error.message });
        }
    },

    // GET /familia/:id_familiar
    show: async (req, res) => {
        try {
            const { id_familiar } = req.params;
            const datos = await FamiliarModel.findOne({
                where: { id_familiar }
            });

            if (datos !== null) {
                return res.json({ result: datos, code: '201' });
            } else {
                return res.json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al buscar", error: error.message });
        }
    },

    // PUT /familia/:id_familiar
    update: async (req, res) => {
        try {
            const { id_familiar } = req.params;
            const { nombres, union, vida, causas } = req.body;

            const datos = await FamiliarModel.findOne({
                where: { id_familiar }
            });

            if (datos !== null) {
                datos.nombres = nombres;
                datos.union = union;
                datos.vida = vida;
                datos.causes = causas; // Respetando columna 'causes' de la DB

                await datos.save();
                return res.json({ result: "Datos actualizados", code: '201' });
            } else {
                return res.json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al actualizar", error: error.message });
        }
    },

    // DELETE /familia/:id_familiar
    destroy: async (req, res) => {
        try {
            const { id_familiar } = req.params;
            const datos = await FamiliarModel.findOne({
                where: { id_familiar }
            });

            if (datos !== null) {
                await datos.destroy();
                return res.json({ result: "Dato Eliminado", code: '201' });
            } else {
                return res.json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al eliminar", error: error.message });
        }
    }
};