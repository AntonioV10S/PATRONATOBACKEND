import { TurnoModel } from '../Models/turno.js';
import { CitaModel } from '../Models/cita.js';
import { RolModel } from '../Models/rol.js';

export const TurnoController = {
    // GET /turnos
    listarTurnos: async (req, res) => {
        try {
            const datos = await TurnoModel.findAll({
                order: [['hora', 'ASC']],
                include: [{ model: RolModel, as: 'rol' }]
            });
            const num_rows = datos.length;

            if (num_rows !== 0) {
                let data = [];

                // Filtro 1: Medicina General
                datos.forEach(tur => {
                    if (tur.rol && tur.rol.rol === 'Medicina General') {
                        data.push(tur);
                    }
                });

                // Filtro 2: Rehabilitación Física
                datos.forEach(tur => {
                    if (tur.rol && tur.rol.rol === 'Rehabilitación Física') {
                        data.push(tur);
                    }
                });

                return res.json({ result: data });
            } else {
                return res.json({ mensaje: "No existen datos registrados", code: '202' });
            }
        } catch (error) {
            res.status(500).json({ message: "Error al listar turnos", error: error.message });
        }
    },

    // POST /turnos
    crearTurno: async (req, res) => {
        try {
            const nuevo = await TurnoModel.create({
                hora: req.body.hora,
                id_rol: req.body.id_rol,
                amount: req.body.amount,
                estado: req.body.estado
            });

            return res.json({ result: "Datos guardados", code: '201', id: nuevo.id_turno });
        } catch (error) {
            res.status(400).json({ message: "Error al registrar turno", error: error.message });
        }
    },

    // GET /turnos/:id
    obtenerTurnoPorId: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await TurnoModel.findOne({
                where: { id_turno: id },
                include: [{ model: RolModel, as: 'rol' }]
            });

            if (datos) {
                return res.json({ result: datos });
            } else {
                return res.json({ mensaje: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            res.status(500).json({ message: "Error al obtener turno", error: error.message });
        }
    },

    // PUT /turnos/:id
    actualizarTurno: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await TurnoModel.findOne({ where: { id_turno: id } });

            if (!datos) {
                return res.json({ mensaje: "Registro no encontrado", code: '202' });
            }

            // Evitar guardar duplicados idénticos en cascada
            if (
                datos.hora === req.body.hora &&
                Number(datos.id_rol) === Number(req.body.id_rol) &&
                Number(datos.amount) === Number(req.body.amount) &&
                datos.estado === req.body.estado
            ) {
                return res.json({ mensaje: "Registro repetido", code: '203' });
            }

            await datos.update({
                hora: req.body.hora,
                id_rol: req.body.id_rol,
                amount: req.body.amount,
                estado: req.body.estado
            });

            return res.json({ mensaje: "Dato Actualizado.", code: '201' });
        } catch (error) {
            res.status(400).json({ message: "Error al actualizar turno", error: error.message });
        }
    },

    // DELETE /turnos/:id
    eliminarTurno: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await TurnoModel.findOne({ where: { id_turno: id } });

            // Validamos contra CitaModel mapeando la llave 'id_turno' de las citas en PostgreSQL
            const datosCita = await CitaModel.findOne({ where: { id_turno: id } });

            if (datosCita !== null) {
                return res.json({ result: "Turno Relacionado", code: '203' });
            } else {
                if (datos !== null) {
                    await datos.destroy();
                    return res.json({ result: "Dato Eliminado", code: '201' });
                } else {
                    return res.json({ result: "Registro no encontrado", code: '202' });
                }
            }
        } catch (error) {
            res.status(500).json({ message: "Error al eliminar turno", error: error.message });
        }
    }
};