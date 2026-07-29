import { EgresoModel } from '../Models/index.js';

export const EgresoController = {

    // GET /egreso
    obtenerTodos: async (req, res) => {
        try {
            const datos = await EgresoModel.findAll();

            if (datos.length !== 0) {
                return res.json({ result: datos, code: '201' });
            } else {
                return res.json({ mensaje: "No hay registros", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error en el servidor", error: error.message });
        }
    },

    // POST /egreso
    crear: async (req, res) => {
        try {
            const { valor, fecha, descripcion } = req.body;

            await EgresoModel.create({
                valor: String(valor), // Asegura que se guarde como VARCHAR según tu base de datos
                fecha,
                descripcion
            });

            return res.json({ result: "Datos guardados", code: '201' });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al guardar", error: error.message });
        }
    },

    // GET /egreso/:id
    obtenerPorId: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await EgresoModel.findOne({ where: { id_egreso: id } });

            if (datos !== null) {
                return res.json({ result: datos, code: '201' });
            } else {
                return res.json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al buscar", error: error.message });
        }
    },

    // PUT /egreso/:id
    actualizar: async (req, res) => {
        try {
            const { id } = req.params;
            const { valor, fecha, descripcion } = req.body;

            const datos = await EgresoModel.findOne({ where: { id_egreso: id } });

            if (datos !== null) {
                datos.valor = String(valor);
                datos.fecha = fecha;
                datos.descripcion = descripcion;

                await datos.save();
                return res.json({ result: "Datos actualizados", code: '201' });
            } else {
                return res.json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al actualizar", error: error.message });
        }
    },

    // DELETE /egreso/:id
    eliminar: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await EgresoModel.findOne({ where: { id_egreso: id } });

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