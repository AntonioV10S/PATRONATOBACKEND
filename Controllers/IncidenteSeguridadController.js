import { IncidenteSeguridadModel, MedicoModel } from '../Models/index.js';

export const IncidenteSeguridadController = {

    // GET /incidentes-seguridad
    listar: async (req, res) => {
        try {
            const datos = await IncidenteSeguridadModel.findAll({
                include: [{ model: MedicoModel, as: 'cuenta', attributes: ['nombres'] }],
                order: [['fecha_incidente', 'DESC']]
            });
            return res.json({ result: datos });
        } catch (error) {
            return res.status(500).json({ mensaje: 'Error al listar incidentes', error: error.message });
        }
    },

    // POST /incidentes-seguridad
    crear: async (req, res) => {
        try {
            const { fecha_incidente, tipo, descripcion, datos_afectados, accion_tomada,
                    notificado_autoridad, fecha_notificacion, notificado_titulares, estado } = req.body;

            if (!fecha_incidente || !tipo || !descripcion) {
                return res.status(400).json({ mensaje: 'Fecha, tipo y descripción son obligatorios.' });
            }

            const nuevo = await IncidenteSeguridadModel.create({
                fecha_incidente, tipo, descripcion, datos_afectados, accion_tomada,
                notificado_autoridad: !!notificado_autoridad,
                fecha_notificacion: fecha_notificacion || null,
                notificado_titulares: !!notificado_titulares,
                estado: estado || 'Abierto',
                registrado_por: req.user?.id_cuenta
            });

            return res.status(201).json({ result: 'Incidente registrado', code: '201', id: nuevo.id_incidente });
        } catch (error) {
            return res.status(400).json({ mensaje: 'Error al registrar el incidente', error: error.message });
        }
    },

    // PUT /incidentes-seguridad/:id
    actualizar: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await IncidenteSeguridadModel.findByPk(id);
            if (!datos) return res.status(404).json({ mensaje: 'Incidente no encontrado' });

            const { descripcion, datos_afectados, accion_tomada, notificado_autoridad,
                    fecha_notificacion, notificado_titulares, estado } = req.body;

            await datos.update({
                descripcion: descripcion ?? datos.descripcion,
                datos_afectados: datos_afectados ?? datos.datos_afectados,
                accion_tomada: accion_tomada ?? datos.accion_tomada,
                notificado_autoridad: notificado_autoridad ?? datos.notificado_autoridad,
                fecha_notificacion: fecha_notificacion ?? datos.fecha_notificacion,
                notificado_titulares: notificado_titulares ?? datos.notificado_titulares,
                estado: estado ?? datos.estado
            });

            return res.json({ mensaje: 'Incidente actualizado', code: '201' });
        } catch (error) {
            return res.status(400).json({ mensaje: 'Error al actualizar el incidente', error: error.message });
        }
    }
};
