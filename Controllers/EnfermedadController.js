import { EnfermedadModel } from '../Models/index.js';

export const EnfermedadController = {

    // GET /enfermedad
    obtenerTodos: async (req, res) => {
        try {
            const datos = await EnfermedadModel.findAll();

            if (datos.length !== 0) {
                return res.json({ result: datos });
            } else {
                return res.json({ mensaje: "No hay registros", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error en el servidor", error: error.message });
        }
    },

    // POST /enfermedad
    crear: async (req, res) => {
        try {
            const { enfermedad, tipo_enfermedad, codigo_cie } = req.body;

            const datos = await EnfermedadModel.create({
                enfermedad,
                tipo_enfermedad,
                codigo_cie: codigo_cie || null
            });

            const idRecienGuardado = datos.id_enfermedad;
            return res.json({
                result: "Datos guardados",
                code: '201',
                id: idRecienGuardado
            });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al guardar", error: error.message });
        }
    },

    // GET /enfermedad/:id_enfermedad
    obtenerPorId: async (req, res) => {
        try {
            const { id_enfermedad } = req.params;
            const datos = await EnfermedadModel.findOne({ where: { id_enfermedad } });

            if (datos !== null) {
                return res.json({ result: datos, code: '201' });
            } else {
                return res.json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al buscar", error: error.message });
        }
    },

    // PUT /enfermedad/:id_enfermedad
    actualizar: async (req, res) => {
        try {
            const { id_enfermedad } = req.params;
            const { enfermedad, tipo_enfermedad, codigo_cie } = req.body;

            const datos = await EnfermedadModel.findOne({ where: { id_enfermedad } });

            if (datos !== null) {
                datos.enfermedad = enfermedad;
                datos.tipo_enfermedad = tipo_enfermedad;
                datos.codigo_cie = codigo_cie || null;
                await datos.save();

                return res.json({ result: "Datos actualizados", code: '201' });
            } else {
                return res.json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al actualizar", error: error.message });
        }
    },

    // DELETE /enfermedad/:id_enfermedad
    eliminar: async (req, res) => {
        try {
            const { id_enfermedad } = req.params;
            const datos = await EnfermedadModel.findOne({ where: { id_enfermedad } });

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