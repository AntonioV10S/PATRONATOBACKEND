import { DetalleEntregaModel, InventarioModel, MedicamentoModel } from '../Models/index.js';

export const DetalleEntregasController = {
    index: async (req, res) => {
        try {
            const datos = await DetalleEntregaModel.findAll();
            if (datos.length !== 0) {
                return res.status(200).json({ result: datos });
            } else {
                return res.status(200).json({ mensaje: "No existen datos registrados", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    datosporidentrega: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await DetalleEntregaModel.findAll({ where: { id_entrega: id } });
            if (datos.length > 0) {
                return res.status(200).json({ result: datos });
            } else {
                return res.status(200).json({ mensaje: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    store: async (req, res) => {
        try {
            const { id_medicamento, id_entrega, cantidadmedicamentos, indicaciones, medicinasinrg } = req.body;
            const datos = await DetalleEntregaModel.create({ id_medicamento, id_entrega, cantidadmedicamentos, indicaciones, medicinasinrg });
            return res.status(201).json({ result: "Datos Entregas guardados", code: '201', datos: datos.id_detalle_entrega });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    actualizaridinventario: async (req, res) => {
        try {
            const { id } = req.params;
            const { id_inventario } = req.body;
            const datos = await DetalleEntregaModel.findByPk(id);
            if (datos) {
                await DetalleEntregaModel.update({ id_inventario }, { where: { id_detalle_entrega: id } });
                return res.status(200).json({ mensaje: "Inventario actualizado de forma exitosa." });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    medicinasinrg: async (req, res) => {
        try {
            const { id_entrega, cantidadmedicamentos, indicaciones, medicinasinrg, dosissinrg, tiposinrg } = req.body;
            const datos = await DetalleEntregaModel.create({ id_entrega, cantidadmedicamentos, indicaciones, medicinasinrg, dosissinrg, tiposinrg });
            return res.status(201).json({ result: "Datos Entregas guardados", code: '201', datos: datos.id_detalle_entrega });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    medicamentosporidentrega: async (req, res) => {
        try {
            const { id_entrega } = req.params;
            let arrz = [];
            let arrj = [];

            const datos = await DetalleEntregaModel.findAll({
                where: { id_entrega },
                include: [{
                    model: MedicamentoModel,
                    as: 'medicamento',
                    attributes: ['id_medicamento', 'nombre', 'id_laboratorio']
                }]
            });

            const invent = await InventarioModel.findAll();

            for (let i = 0; i < datos.length; i++) {
                const mediid = datos[i].medicamento?.id_medicamento;
                for (let j = 0; j < invent.length; j++) {
                    if (mediid === invent[j].id_medicamento) {
                        arrj.push({ fechagroup: invent[j] });
                    }
                }
                arrz.push({
                    nombremedi: datos[i].medicamento?.nombre,
                    mediid,
                    indicaciones: datos[i].indicaciones,
                    cantidadmedicamentos: datos[i].cantidadmedicamentos,
                    fechaexpg: arrj
                });
                arrj = [];
            }

            if (arrz.length !== 0) {
                return res.status(200).json({ result: arrz });
            } else {
                return res.status(200).json({ mensaje: "No existen datos registrados", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
};