import { AntecedenteEnfermedadModel } from '../Models/index.js';

export const AntecedenteEnfermedadController = {
    store: async (req, res) => {
        try {
            const { descripcion } = req.body;
            await AntecedenteEnfermedadModel.create({ descripcion });
            return res.json({ result: "Datos guardados", code: '201' });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al guardar", error: error.message });
        }
    },

    show: async (req, res) => {
        try {
            const { id_a_enfermedad } = req.params;
            const datos = await AntecedenteEnfermedadModel.findOne({ where: { id_a_enfermedad } });

            if (datos) {
                return res.json({ result: datos, code: '201' });
            } else {
                return res.json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al buscar", error: error.message });
        }
    },

    update: async (req, res) => {
        try {
            const { id_a_enfermedad } = req.params;
            const { descripcion } = req.body;

            const datos = await AntecedenteEnfermedadModel.findByPk(id_a_enfermedad);
            if (datos) {
                datos.descripcion = descripcion;
                await datos.save();
                return res.json({ result: "Datos actualizados", code: '201' });
            }
            return res.status(404).json({ mensaje: "Registro no encontrado" });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al actualizar", error: error.message });
        }
    },

    destroy: async (req, res) => {
        try {
            const { id_a_enfermedad } = req.params;
            const datos = await AntecedenteEnfermedadModel.findOne({ where: { id_a_enfermedad } });

            if (datos) {
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