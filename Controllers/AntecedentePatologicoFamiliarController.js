import { AntecedentePatologicoFamiliarModel, FamiliarModel, PacienteModel } from '../Models/index.js';

export const AntecedentePatologicoFamiliarController = {
    // POST /antecedentes/familiar-nuevo
    // Crea el registro de familiar (nombres, union, vida, causes) Y lo
    // vincula al paciente en un solo paso. Antes solo existía "store", que
    // exigía un id_familiar ya creado, pero no había forma de crear uno
    // nuevo desde la API — este endpoint faltaba por completo.
    crearYVincular: async (req, res) => {
        try {
            const { nombres, union, vida, causas, id_paciente } = req.body;

            const familiar = await FamiliarModel.create({ nombres, union, vida, causas });
            const vinculo = await AntecedentePatologicoFamiliarModel.create({
                id_familiar: familiar.id_familiar,
                id_paciente
            });

            return res.json({
                result: "Familiar registrado y vinculado correctamente",
                code: '201',
                id_familiar: familiar.id_familiar,
                id_a_p_familiar: vinculo.id_a_p_familiar
            });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al registrar el familiar", error: error.message });
        }
    },

    // GET /antecedentes/familiares-paciente/:id_paciente
    listarPorPaciente: async (req, res) => {
        try {
            const { id_paciente } = req.params;
            const paciente = await PacienteModel.findByPk(id_paciente, {
                include: [{ model: FamiliarModel, as: 'familiares' }]
            });
            return res.json({ result: paciente ? paciente.familiares : [] });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al listar familiares", error: error.message });
        }
    },

    store: async (req, res) => {
        try {
            const { id_familiar, id_paciente } = req.body;
            const datos = await AntecedentePatologicoFamiliarModel.create({ id_familiar, id_paciente });
            return res.json({ result: "Datos guardados", code: '201', id: datos.id_a_p_familiar });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al guardar", error: error.message });
        }
    },

    show: async (req, res) => {
        try {
            const { id_a_p_familiar } = req.params;
            const datos = await AntecedentePatologicoFamiliarModel.findOne({ where: { id_a_p_familiar } });

            if (datos) {
                return res.json({ result: datos, code: '201' });
            } else {
                return res.json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al buscar", error: error.message });
        }
    },

    eliminar: async (req, res) => {
        try {
            const { id_familiar, id_paciente } = req.params;

            const datosAPF = await AntecedentePatologicoFamiliarModel.findOne({ where: { id_familiar, id_paciente } });
            const datosF = await FamiliarModel.findOne({ where: { id_familiar } });

            if (datosAPF) {
                await datosAPF.destroy();
                if (datosF) await datosF.destroy(); // Réplica lógica de eliminación de Laravel

                return res.json({ result: "Dato Eliminado", code: '201' });
            } else {
                return res.json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al eliminar", error: error.message });
        }
    }
};
