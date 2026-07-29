

import { MedicamentoModel, LaboratorioModel, CategoriaMedicamentoModel } from '../Models/index.js';
import { sequelize } from '../db/conexion.js';

export const MedicamentosController = {
    // GET /medicamentos
    index: async (req, res) => {
        try {
            // Replicamos los INNER JOINs de Laravel usando include en Sequelize
            const datos = await MedicamentoModel.findAll({
                include: [
                    {
                        model: LaboratorioModel,
                        as: 'laboratorio',
                        required: true, // Fuerza INNER JOIN
                        attributes: [] // No extrae el objeto anidado para aplanar la respuesta
                    },
                    {
                        model: CategoriaMedicamentoModel,
                        as: 'categoriaMedicamento',
                        required: true,
                        attributes: []
                    }
                ],
                // Mapeamos los select crudos para que mantengan la estructura exacta que espera tu frontend
                attributes: [
                    'id_medicamento', 'id_categoriamedicamento', 'id_laboratorio', 'nombre', 'descripcion', 'estado',
                    [sequelize.col('laboratorio.nombre'), 'nombre_laboratorio'],
                    [sequelize.col('categoriaMedicamento.tipo'), 'tipo_medicamentos']
                ]
            });

            if (datos.length !== 0) {
                return res.json({ result: datos });
            } else {
                return res.json({ mensaje: "No existen datos registrados", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    // POST /medicamentos
    store: async (req, res) => {
        try {
            const { id_categoriamedicamento, id_laboratorio, nombre, descripcion } = req.body;

            const nuevoMedicamento = await MedicamentoModel.create({
                id_categoriamedicamento,
                id_laboratorio,
                nombre,
                descripcion,
                estado: true
            });

            return res.json({
                result: "Datos guardados",
                code: '201',
                id: nuevoMedicamento.id_medicamento
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
};