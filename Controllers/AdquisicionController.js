import { AdquisicionModel } from '../Models/index.js';

export const AdquisicionController = {
    index: async (req, res) => {
        try {
            const datos = await AdquisicionModel.findAll();
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
            // El documento se sube primero al endpoint genérico /api/upload
            // (igual que las fotos de cuentas); aquí solo se referencia el
            // nombre de archivo resultante. Antes se dependía de req.file
            // (Multer), pero esta ruta nunca tuvo el middleware de Multer
            // registrado, así que el documento nunca se guardaba.
            const { numeroadqui, precioadqui, descripcionadqui, fecharegadqui, fechaadqui, tipoadqui, documento } = req.body;

            const datos = await AdquisicionModel.create({
                numeroadqui,
                precioadqui,
                descripcionadqui,
                fecharegadqui,
                fechaadqui,
                tipoadqui,
                estadoadqui: 1,
                documento: documento || null
            });

            return res.json({
                result: "Datos guardados",
                code: '201',
                id: datos.id_adquisicion
            });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al guardar", error: error.message });
        }
    }
};