import { DiagnosticoModel } from '../Models/index.js';

export const DiagnosticoController = {

    // GET /diagnostico
    obtenerTodos: async (req, res) => {
        try {
            const datos = await DiagnosticoModel.findAll();

            if (datos.length !== 0) {
                return res.json({ result: datos });
            } else {
                return res.json({ mensaje: "No hay registros", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error en el servidor", error: error.message });
        }
    },

    // POST /diagnostico
    crear: async (req, res) => {
        try {
            const { diagnostico, codigo_cie } = req.body;

            // Inserta en la tabla catalogaria pública
            const datos = await DiagnosticoModel.create({
                diagnostico: diagnostico,
                codigo_cie: codigo_cie || null
            });

            const idRecienGuardado = datos.id_diagnostico;
            return res.json({
                result: "Datos guardados",
                code: '201',
                id: idRecienGuardado
            });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al guardar", error: error.message });
        }
    },

    // GET /diagnostico/:id_diagnostico
    obtenerPorId: async (req, res) => {
        try {
            const { id_diagnostico } = req.params;
            const datos = await DiagnosticoModel.findOne({
                where: { id_diagnostico }
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

    // PUT /diagnostico/:id_diagnostico
    actualizar: async (req, res) => {
        try {
            const { id_diagnostico } = req.params;
            const { diagnostico, codigo_cie } = req.body;

            const datos = await DiagnosticoModel.findOne({ where: { id_diagnostico } });

            if (datos !== null) {
                datos.diagnostico = diagnostico;
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

    // DELETE /diagnostico/:id_diagnostico
    eliminar: async (req, res) => {
        try {
            const { id_diagnostico } = req.params;

            // CORREGIDO: Buscaba por el texto del diagnóstico en tu PHP. 
            // Ahora busca y elimina correctamente usando la PK 'id_diagnostico' según tu script SQL.
            const datos = await DiagnosticoModel.findOne({ where: { id_diagnostico } });

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