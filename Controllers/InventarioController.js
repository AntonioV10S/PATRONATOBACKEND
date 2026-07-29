import { InventarioModel, MedicamentoModel } from '../Models/index.js';

export const InventarioController = {
    // GET /inventario
    index: async (req, res) => {
        try {
            const datos = await InventarioModel.findAll({
                where: { estado: true },
                include: [{
                    model: MedicamentoModel,
                    as: 'medicamento',
                    required: true,
                    attributes: ['nombre']
                }]
            });

            const resultado = datos.map((item) => ({
                ...item.toJSON(),
                nombre_medicamento: item.medicamento?.nombre,
                medicamento: undefined
            }));

            if (resultado.length !== 0) {
                return res.json({ result: resultado });
            } else {
                return res.json({ mensaje: "No existen datos registrados", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error en el servidor", error: error.message });
        }
    },

    // POST /inventario
    store: async (req, res) => {
        try {
            const { id_medicamento, existencias, fechacre, fechaexp, fechareg, valoruni, codigodebarra } = req.body;

            const datos = await InventarioModel.create({
                id_medicamento,
                existencias,
                fechacre,
                fechaexp,
                fechareg,
                valoruni,
                codigodebarra,
                estado: true
            });

            return res.json({ result: "Datos guardados", code: '201', id: datos.id_inventario });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al guardar", error: error.message });
        }
    },

    // GET /inventario/:id
    show: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await InventarioModel.findByPk(id);
            if (datos) {
                return res.json({ result: datos });
            } else {
                return res.json({ mensaje: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al buscar", error: error.message });
        }
    },

    // PUT /actualizarexistencia/:id
    updateExistencia: async (req, res) => {
        try {
            const { id } = req.params;
            const { existencias } = req.body;
            const datos = await InventarioModel.findByPk(id);

            if (datos) {
                datos.existencias = existencias;
                await datos.save();
                return res.json({ message: 'Estado del parámetro actualizado correctamente' });
            } else {
                return res.status(404).json({ message: 'No se encontró el parámetro con el ID proporcionado' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al actualizar existencia", error: error.message });
        }
    },

    // PUT /medicamentodesechado/:id
    medicamentodesechado: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await InventarioModel.findByPk(id);

            if (datos) {
                datos.estado = false;
                await datos.save();
                return res.json({ message: 'Estado del parámetro actualizado correctamente' });
            } else {
                return res.status(404).json({ message: 'No se encontró el parámetro con el ID proporcionado' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al desechar medicamento", error: error.message });
        }
    },

    // PUT /subtract-inventory/:id
    subtractInventory: async (req, res) => {
        try {
            const { id } = req.params;
            const { medentregar } = req.body;
            const datos = await InventarioModel.findByPk(id);

            if (!datos) {
                return res.status(404).json({ message: 'No se encontró el parámetro con el ID proporcionado' });
            }

            const aRestar = Number(medentregar) || 0;
            if (aRestar > datos.existencias) {
                return res.status(400).json({ message: 'No hay existencias suficientes para esta entrega' });
            }

            datos.existencias -= aRestar;
            await datos.save();
            return res.json({ message: 'Inventario actualizado correctamente' });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al restar inventario", error: error.message });
        }
    },

    // DELETE /inventario/:id
    destroy: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await InventarioModel.findByPk(id);
            if (datos) {
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
