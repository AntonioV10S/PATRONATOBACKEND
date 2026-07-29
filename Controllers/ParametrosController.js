import { ParametroModel } from '../Models/parametro.js';
import { Op } from 'sequelize';

export const ParametrosController = {
    // GET /parametros
    listarParametros: async (req, res) => {
        try {
            const datos = await ParametroModel.findAll();
            const total = datos.length;

            if (total !== 0) {
                return res.json({ result: datos });
            } else {
                return res.json({ mensaje: "No existen datos registrados", code: '202' });
            }
        } catch (error) {
            res.status(500).json({ message: "Error al obtener parámetros", error: error.message });
        }
    },

    // POST /parametros
    crearParametro: async (req, res) => {
        try {
            const nuevo = await ParametroModel.create({
                nombres: req.body.nombres,
                cargo: req.body.cargo,
                profesion: req.body.profesion,
                valor: req.body.valor,
                resolucion: req.body.resolucion,
                pexistenciasmin: req.body.pexistenciasmin,
                pfechaexp: req.body.pfechaexp,
                estado: req.body.estado
            });

            return res.status(201).json({
                result: "Datos guardados",
                code: '201',
                id: nuevo.id_parametros
            });
        } catch (error) {
            res.status(400).json({ message: "Error al registrar parámetro", error: error.message });
        }
    },

    // GET /parametros/:id
    obtenerParametroPorId: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await ParametroModel.findOne({ where: { id_parametros: id } });

            if (datos) {
                return res.json({ result: datos });
            } else {
                return res.json({ mensaje: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            res.status(500).json({ message: "Error en la búsqueda por ID", error: error.message });
        }
    },

    // PUT /parametros/:id
    actualizarParametro: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await ParametroModel.findOne({ where: { id_parametros: id } });

            if (!datos) return res.status(404).json({ mensaje: "Registro no encontrado", code: '202' });

            await datos.update({
                nombres: req.body.nombres,
                cargo: req.body.cargo,
                profesion: req.body.profesion,
                valor: req.body.valor,
                resolucion: req.body.resolucion,
                estado: req.body.estado
            });

            return res.json({ mensaje: "Dato Actualizado.", code: '201' });
        } catch (error) {
            res.status(400).json({ message: "Error al actualizar parámetro", error: error.message });
        }
    },

    // PUT /parametros/estado/:id
    actualizarEstadoParametro: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await ParametroModel.findByPk(id);

            if (datos) {
                await datos.update({ estado: false });
                return res.json({ message: 'Estado del parámetro actualizado correctamente' });
            } else {
                return res.status(404).json({ message: 'No se encontró el parámetro con el ID proporcionado' });
            }
        } catch (error) {
            res.status(500).json({ message: "Error al cambiar estado del parámetro", error: error.message });
        }
    },

    // GET /parametros/data/mgv1
    getMGV1Data: async (req, res) => {
        try {
            const dato = await ParametroModel.findOne({
                where: { nombres: 'MGV1', estado: true }
            });

            if (dato) {
                return res.json({ result: dato });
            } else {
                return res.json({ mensaje: "No existe dato de MGV1 con estado true", code: '202' });
            }
        } catch (error) {
            res.status(500).json({ message: "Error al obtener datos MGV1", error: error.message });
        }
    },

    // GET /parametros/data/mgv2
    getMGV2Data: async (req, res) => {
        try {
            const dato = await ParametroModel.findOne({
                where: { nombres: 'MGV2', estado: true }
            });

            if (dato) {
                return res.json({ result: dato });
            } else {
                return res.json({ mensaje: "No existe dato de MGV2 con estado true", code: '202' });
            }
        } catch (error) {
            res.status(500).json({ message: "Error al obtener datos MGV2", error: error.message });
        }
    },

    // GET /parametros/data/rfv1
    getRFV1Data: async (req, res) => {
        try {
            const dato = await ParametroModel.findOne({
                where: { nombres: 'RFV1', estado: true }
            });

            if (dato) {
                return res.json({ result: dato });
            } else {
                return res.json({ mensaje: "No existe dato de MGV2 con estado true", code: '202' }); // Se mantiene el mensaje exacto de tu PHP
            }
        } catch (error) {
            res.status(500).json({ message: "Error al obtener datos RFV1", error: error.message });
        }
    },

    // GET /parametros/data/rfv2
    getRFV2Data: async (req, res) => {
        try {
            const dato = await ParametroModel.findOne({
                where: { nombres: 'RFV2', estado: true }
            });

            if (dato) {
                return res.json({ result: dato });
            } else {
                return res.json({ mensaje: "No existe dato de MGV2 con estado true", code: '202' }); // Se mantiene el mensaje exacto de tu PHP
            }
        } catch (error) {
            res.status(500).json({ message: "Error al obtener datos RFV2", error: error.message });
        }
    },

    // GET /parametros/data/nombredoc
    getnombredoc: async (req, res) => {
        try {
            const dato = await ParametroModel.findOne({
                where: { cargo: 'Médico General', estado: true }
            });

            if (dato) {
                return res.json({ result: dato });
            } else {
                return res.json({ mensaje: "No existe dato de MGV2 con estado true", code: '202' }); // Se mantiene el mensaje exacto de tu PHP
            }
        } catch (error) {
            res.status(500).json({ message: "Error al obtener nombre del doctor", error: error.message });
        }
    },

    // GET /parametros/data/stockmin
    getstockmin: async (req, res) => {
        try {
            const dato = await ParametroModel.findOne({
                where: {
                    pexistenciasmin: { [Op.ne]: null }, // Mapea el whereNotNull de Laravel
                    estado: true
                }
            });

            if (dato) {
                return res.json({ result: dato });
            } else {
                return res.json({ mensaje: "No existe dato de stockmin con estado true", code: '202' });
            }
        } catch (error) {
            res.status(500).json({ message: "Error al obtener stock mínimo", error: error.message });
        }
    },

    // GET /parametros/data/diasexp
    getsdiasexp: async (req, res) => {
        try {
            const dato = await ParametroModel.findOne({
                where: {
                    pfechaexp: { [Op.ne]: null }, // Mapea el whereNotNull de Laravel
                    estado: true
                }
            });

            if (dato) {
                return res.json({ result: dato });
            } else {
                return res.json({ mensaje: "No existe dato de dias minimo con estado true", code: '202' });
            }
        } catch (error) {
            res.status(500).json({ message: "Error al obtener días de expiración", error: error.message });
        }
    },

    // DELETE /parametros/:id
    eliminarParametro: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await ParametroModel.findByPk(id);

            if (!datos) {
                return res.status(404).json({ message: "No hay Parametros we" }); // Manteniendo tu divertido mensaje original en PHP
            }

            await datos.update({ estado: false });
            return res.status(201).json({ message: 'Estado actualizado' });
        } catch (error) {
            res.status(500).json({ message: "Error al eliminar parámetro", error: error.message });
        }
    }
};