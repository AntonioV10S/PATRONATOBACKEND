import { HabitoModel, PacienteModel } from '../Models/index.js';

export const HabitoController = {

    // GET /habito
    index: async (req, res) => {
        try {
            const datos = await HabitoModel.findAll();
            if (datos.length !== 0) {
                return res.json({ result: datos });
            } else {
                return res.json({ mensaje: "No existen datos registrados", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error en el servidor", error: error.message });
        }
    },

    // POST /habito
    store: async (req, res) => {
        try {
            const { alcohol, tabaco, drogas, alimentacion, diuresis, somnia, id_paciente } = req.body;

            const datos = await HabitoModel.create({
                alcohol,
                tabaco,
                drogas,
                alimentacion,
                diuresis,
                somnia
            });

            // Vincula el hábito recién creado al paciente (pacientes.id_habito),
            // igual que ya se hace con examenes_complementarios.
            if (id_paciente) {
                const paciente = await PacienteModel.findByPk(id_paciente);
                if (paciente) {
                    paciente.id_habito = datos.id_habito;
                    await paciente.save();
                }
            }

            return res.json({
                result: "Datos guardados",
                code: '201',
                id: datos.id_habito
            });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al guardar", error: error.message });
        }
    },

    // GET /habito/:id
    show: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await HabitoModel.findOne({
                where: { id_habito: id }
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

    // PUT /habito/:id
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { alcohol, tabaco, drogas, alimentacion, diuresis, somnia } = req.body;

            const datos = await HabitoModel.findOne({
                where: { id_habito: id }
            });

            if (datos !== null) {
                datos.alcohol = alcohol;
                datos.tabaco = tabaco;
                datos.drogas = drogas;
                datos.alimentacion = alimentacion;
                datos.diuresis = diuresis;
                datos.somnia = somnia;

                await datos.save();
                return res.json({ mensaje: "Dato Actualizado.", code: '201' });
            } else {
                return res.json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al actualizar", error: error.message });
        }
    },

    // DELETE /habito/:id
    destroy: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await HabitoModel.findOne({
                where: { id_habito: id }
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