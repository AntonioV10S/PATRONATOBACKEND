import { RolModel, MedicoModel as CuentaModel } from '../Models/index.js';


export const RoleController = {
    // GET /roles
    listarRoles: async (req, res) => {
        try {
            const datos = await RolModel.findAll();
            const num_rows = datos.length;

            if (num_rows !== 0) {
                return res.json({ result: datos });
            } else {
                return res.json({ mensaje: "No existen datos registrados", code: '202' });
            }
        } catch (error) {
            res.status(500).json({ message: "Error al listar roles", error: error.message });
        }
    },

    // POST /roles
    crearRol: async (req, res) => {
        try {
            const nuevo = await RolModel.create({
                rol: req.body.rol,
                estado: req.body.estado,
                atencion: req.body.atencion,
                atiende_medico: req.body.atiende_medico || false
            });

            return res.json({ result: "Datos guardados", code: '201', id: nuevo.id_rol });
        } catch (error) {
            res.status(400).json({ message: "Error al registrar rol", error: error.message });
        }
    },

    // GET /roles/:id
    obtenerRolPorId: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await RolModel.findOne({ where: { id_rol: id } });

            if (datos) {
                return res.json({ result: datos });
            } else {
                return res.json({ mensaje: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            res.status(500).json({ message: "Error al obtener rol", error: error.message });
        }
    },

    // PUT /roles/:id
    actualizarRol: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await RolModel.findOne({ where: { id_rol: id } });

            if (datos) {
                if (datos.rol === 'Administrador') {
                    return res.status(403).json({ mensaje: "El rol Administrador es protegido y no se puede modificar.", code: '403' });
                }
                await datos.update({
                    rol: req.body.rol,
                    estado: req.body.estado,
                    atencion: req.body.atencion,
                    atiende_medico: req.body.atiende_medico
                });
                return res.json({ mensaje: "Dato Actualizado.", code: '201' });
            } else {
                return res.json({ mensaje: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            res.status(400).json({ message: "Error al actualizar rol", error: error.message });
        }
    },

    // DELETE /roles/:id
    eliminarRol: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await RolModel.findOne({ where: { id_rol: id } });

            if (datos && datos.rol === 'Administrador') {
                return res.status(403).json({ result: "El rol Administrador es protegido y no se puede eliminar.", code: '403' });
            }

            const datosCuenta = await CuentaModel.findOne({ where: { id_rol: id } });

            if (datosCuenta !== null) {
                return res.json({ result: "Rol Relacionado", code: '203' });
            } else {
                if (datos !== null) {
                    await datos.destroy();
                    return res.json({ result: "Dato Eliminado", code: '201' });
                } else {
                    return res.json({ result: "Registro no encontrado", code: '202' });
                }
            }
        } catch (error) {
            res.status(500).json({ message: "Error al eliminar rol", error: error.message });
        }
    },

    // GET /roles/especialidad/:especialidad
    idRol: async (req, res) => {
        try {
            const { especialidad } = req.params;
            const datos = await RolModel.findOne({ where: { rol: especialidad } });
            return res.json({ result: datos, code: '201' });
        } catch (error) {
            res.status(500).json({ message: "Error al obtener ID del rol", error: error.message });
        }
    },

    // GET /roles/medicos
    rolesMedicos: async (req, res) => {
        try {
            const datos = await RolModel.findAll({
                where: {
                    atencion: true,
                    atiende_medico: false
                }
            });

            if (datos.length > 0) {
                return res.json({ result: datos, code: '201' });
            } else {
                return res.json({ result: "No hay datos", code: '202' });
            }
        } catch (error) {
            res.status(500).json({ message: "Error al listar roles médicos", error: error.message });
        }
    }
};