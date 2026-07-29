import { ExamenOrganoSistemaModel, PacienteModel } from '../Models/index.js';

export const ExamenOrganoSistemaController = {

    // GET /examen-organo-sistema
    index: async (req, res) => {
        try {
            const datos = await ExamenOrganoSistemaModel.findAll();
            if (datos.length !== 0) {
                return res.json({ result: datos });
            } else {
                return res.json({ mensaje: "No existen datos registrados", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error en el servidor", error: error.message });
        }
    },

    // POST /examen-organo-sistema
    store: async (req, res) => {
        try {
            const {
                sistema_digestivo, sistema_respiratorio, sistema_cardiaco,
                sistema_genitourinarion, sistema_osteomuscular, sistema_nervioso, id_paciente
            } = req.body;

            const datos = await ExamenOrganoSistemaModel.create({
                sistema_digestivo,
                sistema_respiratorio,
                sistema_cardiaco,
                sistema_genitourinarion, // Mantengo la 'n' al final según tu script SQL
                sistema_osteomuscular,
                sistema_nervioso
            });

            // Vincula el examen recién creado al paciente (pacientes.id_e_organo_sistema).
            if (id_paciente) {
                const paciente = await PacienteModel.findByPk(id_paciente);
                if (paciente) {
                    paciente.id_e_organo_sistema = datos.id_e_organo_sistema;
                    await paciente.save();
                }
            }

            return res.json({
                result: "Datos guardados",
                code: '201',
                id: datos.id_e_organo_sistema
            });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al guardar", error: error.message });
        }
    },

    // GET /examen-organo-sistema/:id
    show: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await ExamenOrganoSistemaModel.findOne({
                where: { id_e_organo_sistema: id }
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

    // PUT /examen-organo-sistema/:id
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                sistema_digestivo, sistema_respiratorio, sistema_cardiaco,
                sistema_genitourinarion, sistema_osteomuscular, sistema_nervioso
            } = req.body;

            const datos = await ExamenOrganoSistemaModel.findOne({
                where: { id_e_organo_sistema: id }
            });

            if (datos !== null) {
                datos.sistema_digestivo = sistema_digestivo;
                datos.sistema_respiratorio = sistema_respiratorio;
                datos.sistema_cardiaco = sistema_cardiaco;
                datos.sistema_genitourinarion = sistema_genitourinarion;
                datos.sistema_osteomuscular = sistema_osteomuscular;
                datos.sistema_nervioso = sistema_nervioso;

                await datos.save();
                return res.json({ mensaje: "Dato Actualizado.", code: '201' });
            } else {
                return res.json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al actualizar", error: error.message });
        }
    },

    // DELETE /examen-organo-sistema/:id
    destroy: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await ExamenOrganoSistemaModel.findOne({
                where: { id_e_organo_sistema: id }
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