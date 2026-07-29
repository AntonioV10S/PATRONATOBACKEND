import { SolicitudArcoModel, PacienteModel, MedicoModel } from '../Models/index.js';

export const SolicitudArcoController = {

    // GET /solicitudes-arco
    listar: async (req, res) => {
        try {
            const datos = await SolicitudArcoModel.findAll({
                include: [
                    { model: PacienteModel, as: 'paciente', attributes: ['nombres', 'apellidos'] },
                    { model: MedicoModel, as: 'cuenta', attributes: ['nombres'] }
                ],
                order: [['fecha_solicitud', 'DESC']]
            });
            return res.json({ result: datos });
        } catch (error) {
            return res.status(500).json({ mensaje: 'Error al listar solicitudes', error: error.message });
        }
    },

    // POST /solicitudes-arco
    crear: async (req, res) => {
        try {
            const { id_paciente, tipo_solicitud, descripcion, fecha_solicitud } = req.body;

            if (!id_paciente || !tipo_solicitud || !descripcion || !fecha_solicitud) {
                return res.status(400).json({ mensaje: 'Paciente, tipo de solicitud, descripción y fecha son obligatorios.' });
            }

            const nuevo = await SolicitudArcoModel.create({
                id_paciente, tipo_solicitud, descripcion, fecha_solicitud,
                estado: 'Pendiente',
                registrado_por: req.user?.id_cuenta
            });

            return res.status(201).json({ result: 'Solicitud registrada', code: '201', id: nuevo.id_solicitud });
        } catch (error) {
            return res.status(400).json({ mensaje: 'Error al registrar la solicitud', error: error.message });
        }
    },

    // PUT /solicitudes-arco/:id
    resolver: async (req, res) => {
        try {
            const { id } = req.params;
            const { estado, resolucion } = req.body;
            const datos = await SolicitudArcoModel.findByPk(id);
            if (!datos) return res.status(404).json({ mensaje: 'Solicitud no encontrada' });

            await datos.update({
                estado: estado || datos.estado,
                resolucion: resolucion ?? datos.resolucion,
                fecha_resolucion: new Date().toISOString().split('T')[0]
            });

            return res.json({ mensaje: 'Solicitud actualizada', code: '201' });
        } catch (error) {
            return res.status(400).json({ mensaje: 'Error al actualizar la solicitud', error: error.message });
        }
    }
};
