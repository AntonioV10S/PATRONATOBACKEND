import { DetalleAdquisicionModel, MedicamentoModel } from '../Models/index.js';

export const DetalleAdquisicionController = {
    index: async (req, res) => {
        try {
            const datos = await DetalleAdquisicionModel.findAll({
                include: [{
                    model: MedicamentoModel,
                    as: 'medicamento',
                    attributes: ['nombre']
                }]
            });

            const resultado = datos.map((item) => ({
                ...item.toJSON(),
                nombre_medicamento: item.medicamento?.nombre,
                medicamento: undefined
            }));

            if (resultado.length !== 0) {
                return res.status(200).json({ result: resultado });
            } else {
                return res.status(200).json({ mensaje: "No existen datos registrados", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    store: async (req, res) => {
        try {
            const { id_adquisicion, id_medicamento, cantidadmedicamentos, fechacre, fechaexp, valoruni, codigodebarra, fechareg } = req.body;
            const nuevoDetalle = await DetalleAdquisicionModel.create({
                id_adquisicion, id_medicamento, cantidadmedicamentos, fechacre, fechaexp, valoruni, codigodebarra, fechareg, estado: true
            });
            return res.status(201).json({ result: "Datos guardados", code: '201', id: nuevoDetalle.id_detalle_adquisicion });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
};