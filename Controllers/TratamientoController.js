import { TratamientoModel } from '../Models/tratamiento.js';

export const TratamientoController = {
    // GET /tratamientos
    listarTratamientos: async (req, res) => {
        try {
            const datos = await TratamientoModel.findAll();
            const num_rows = datos.length;

            if (num_rows !== 0) {
                return res.json({ result: datos });
            } else {
                return res.json({ mensaje: "No existen datos registrados", code: '202' });
            }
        } catch (error) {
            res.status(500).json({ message: "Error al listar tratamientos", error: error.message });
        }
    },

    // POST /tratamientos
    crearTratamiento: async (req, res) => {
        try {
            const nuevo = await TratamientoModel.create({
                // En tu DB, estos campos son de tipo string (character varying)
                estimulacion_temprana: req.body.estimulacion_temprana,
                magnetoterapia: req.body.magnetoterapia,
                electroestimulacion: req.body.electroestimulacion,
                ultrasonido: req.body.ultrasonido,
                C_Q_C_O_H: req.body.C_Q_C_O_H,
                masaje: req.body.masaje,
                ejercicios_pasivos_resistidos: req.body.ejercicios_pasivos_resistidos,
                laser: req.body.laser,
                otros: req.body.otros
            });

            return res.json({ result: "Datos guardados", code: '201', id: nuevo.id_tratamiento });
        } catch (error) {
            res.status(400).json({ message: "Error al registrar tratamiento", error: error.message });
        }
    },

    // GET /tratamientos/:id
    obtenerTratamientoPorId: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await TratamientoModel.findOne({ where: { id_tratamiento: id } });

            if (datos) {
                return res.json({ result: datos });
            } else {
                return res.json({ mensaje: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            res.status(500).json({ message: "Error al obtener tratamiento", error: error.message });
        }
    },

    // PUT /tratamientos/:id
    actualizarTratamiento: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await TratamientoModel.findOne({ where: { id_tratamiento: id } });

            if (datos) {
                await datos.update({
                    estimulacion_temprana: req.body.estimulacion_temprana,
                    magnetoterapia: req.body.magnetoterapia,
                    electroestimulacion: req.body.electroestimulacion,
                    ultrasonido: req.body.ultrasonido,
                    C_Q_C_O_H: req.body.C_Q_C_O_H,
                    masaje: req.body.masaje,
                    ejercicios_pasivos_resistidos: req.body.ejercicios_pasivos_resistidos,
                    laser: req.body.laser,
                    otros: req.body.otros
                });
                return res.json({ mensaje: "Dato Actualizado.", code: '201' });
            } else {
                return res.json({ mensaje: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            res.status(400).json({ message: "Error al actualizar tratamiento", error: error.message });
        }
    },

    // DELETE /tratamientos/:id
    eliminarTratamiento: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await TratamientoModel.findOne({ where: { id_tratamiento: id } });

            if (datos) {
                await datos.destroy();
                return res.json({ result: "Dato Eliminado", code: '201' });
            } else {
                return res.json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            res.status(500).json({ message: "Error al eliminar tratamiento", error: error.message });
        }
    }
};