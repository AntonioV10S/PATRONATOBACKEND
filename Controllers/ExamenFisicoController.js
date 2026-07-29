import { ExamenFisicoModel, PacienteModel } from '../Models/index.js';

export const ExamenFisicoController = {

    // GET /examen-fisico
    index: async (req, res) => {
        try {
            const datos = await ExamenFisicoModel.findAll();
            if (datos.length !== 0) {
                return res.json({ result: datos });
            } else {
                return res.json({ mensaje: "No existen datos registrados", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error en el servidor", error: error.message });
        }
    },

    // POST /examen-fisico
    store: async (req, res) => {
        try {
            const {
                cabeza, cuello, torax, abdomen,
                miembros_superiores, miembros_inferiores,
                region_genital, region_anal, id_paciente
            } = req.body;

            const datos = await ExamenFisicoModel.create({
                cabeza, cuello, torax, abdomen,
                miembros_superiores, miembros_inferiores,
                region_genital, region_anal
            });

            // Vincula el examen recién creado al paciente (pacientes.id_e_fisico).
            if (id_paciente) {
                const paciente = await PacienteModel.findByPk(id_paciente);
                if (paciente) {
                    paciente.id_e_fisico = datos.id_e_fisico;
                    await paciente.save();
                }
            }

            return res.json({
                result: "Datos guardados",
                code: '201',
                id: datos.id_e_fisico
            });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al guardar", error: error.message });
        }
    },

    // GET /examen-fisico/:id
    show: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await ExamenFisicoModel.findOne({
                where: { id_e_fisico: id }
            });

            if (datos !== null) {
                return res.json({ result: datos });
            } else {
                return res.json({ mensaje: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al buscar", error: error.message });
        }
    },

    // PUT /examen-fisico/:id
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                cabeza, cuello, torax, abdomen,
                miembros_superiores, miembros_inferiores,
                region_genital, region_anal
            } = req.body;

            const datos = await ExamenFisicoModel.findOne({
                where: { id_e_fisico: id }
            });

            if (datos !== null) {
                datos.cabeza = cabeza;
                datos.cuello = cuello;
                datos.torax = torax;
                datos.abdomen = abdomen;
                datos.miembros_superiores = miembros_superiores;
                datos.miembros_inferiores = miembros_inferiores;
                datos.region_genital = region_genital;
                datos.region_anal = region_anal;

                await datos.save();
                return res.json({ mensaje: "Dato Actualizado.", code: '201' });
            } else {
                return res.json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al actualizar", error: error.message });
        }
    },

    // DELETE /examen-fisico/:id
    destroy: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await ExamenFisicoModel.findOne({
                where: { id_e_fisico: id }
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