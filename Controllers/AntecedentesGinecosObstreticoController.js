import { AntecedenteGinecoModel, AntecedentePatologicoPersonalModel } from '../Models/index.js';

export const AntecedentesGinecosObstreticoController = {
    index: async (req, res) => {
        try {
            const datos = await AntecedenteGinecoModel.findAll({
                include: [{ model: AntecedentePatologicoPersonalModel, as: 'antecedentes_patologicos_personales' }]
            });
            if (datos.length !== 0) {
                return res.json({ result: datos });
            } else {
                return res.json({ mensaje: "No existen datos registrados", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error en el servidor", error: error.message });
        }
    },

    store: async (req, res) => {
        try {
            const { FUM, FPP, edad_gestional, menarquia, flujo_genital, gestas, partos, cesareas, abortos } = req.body;
            const datos = await AntecedenteGinecoModel.create({
                FUM, FPP, edad_gestional, menarquia, flujo_genital, gestas, partos, cesareas, abortos
            });
            return res.json({ result: "Datos guardados", code: '201', id: datos.id_gineco });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al guardar", error: error.message });
        }
    },

    show: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await AntecedenteGinecoModel.findOne({ where: { id_gineco: id } });
            if (datos) {
                return res.json({ result: datos });
            } else {
                return res.json({ mensaje: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al buscar", error: error.message });
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { FUM, FPP, edad_gestional, menarquia, flujo_genital, gestas, partos, cesareas, abortos } = req.body;

            const datos = await AntecedenteGinecoModel.findOne({ where: { id_gineco: id } });
            if (datos) {
                datos.FUM = FUM;
                datos.FPP = FPP;
                datos.edad_gestional = edad_gestional;
                datos.menarquia = menarquia;
                datos.flujo_genital = flujo_genital;
                datos.gestas = gestas;
                datos.partos = partos;
                datos.cesareas = cesareas;
                datos.abortos = abortos;
                await datos.save();

                return res.json({ mensaje: "Dato Actualizado.", code: '201' });
            }
            return res.json({ mensaje: "Registro no encontrado", code: '202' });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al actualizar", error: error.message });
        }
    },

    destroy: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await AntecedenteGinecoModel.findOne({ where: { id_gineco: id } });
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
