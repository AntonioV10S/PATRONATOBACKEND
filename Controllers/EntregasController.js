import { EntregaModel, PacienteModel } from '../Models/index.js';

export const EntregasController = {

    // GET /entregas (Pendientes)
    index: async (req, res) => {
        try {
            const datos = await EntregaModel.findAll({
                where: { entregado: false },
                include: [{
                    model: PacienteModel,
                    as: 'paciente', // Asegúrate de que el alias coincida en tus asociaciones de Sequelize
                    required: true,
                    attributes: ['nombres', 'apellidos', 'edad'] // En tu DB la columna es cedula_enc, no cedula simple
                }]
            });

            if (datos.length !== 0) {
                // Formateamos la respuesta para mantener la estructura plana idéntica a tu Laravel original
                const resultadoFormateado = datos.map(entrega => ({
                    ...entrega.toJSON(),
                    nombres: entrega.paciente?.nombres,
                    apellidos: entrega.paciente?.apellidos,
                    edad: entrega.paciente?.edad,
                    paciente: undefined // Limpiamos el objeto anidado para mantener compatibilidad frontend
                }));
                return res.json({ result: resultadoFormateado });
            } else {
                return res.json({ mensaje: "No existen datos registrados", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error en el servidor", error: error.message });
        }
    },

    // GET /entregas/entregadas
    entregadas: async (req, res) => {
        try {
            const datos = await EntregaModel.findAll({
                where: { entregado: true },
                include: [{
                    model: PacienteModel,
                    as: 'paciente',
                    required: true,
                    attributes: ['nombres', 'apellidos', 'edad']
                }]
            });

            if (datos.length !== 0) {
                const resultadoFormateado = datos.map(entrega => ({
                    ...entrega.toJSON(),
                    nombres: entrega.paciente?.nombres,
                    apellidos: entrega.paciente?.apellidos,
                    edad: entrega.paciente?.edad,
                    paciente: undefined
                }));
                return res.json({ result: resultadoFormateado });
            } else {
                return res.json({ mensaje: "No existen datos registrados", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error en el servidor", error: error.message });
        }
    },

    // GET /entregas/entregadasu10
    entregadasu10: async (req, res) => {
        try {
            const datos = await EntregaModel.findAll({
                where: { entregado: true },
                include: [{
                    model: PacienteModel,
                    as: 'paciente',
                    required: true,
                    attributes: ['nombres', 'apellidos', 'edad']
                }],
                order: [['Fechaentrega', 'DESC']],
                limit: 10
            });

            if (datos.length !== 0) {
                const resultadoFormateado = datos.map(entrega => ({
                    ...entrega.toJSON(),
                    nombres: entrega.paciente?.nombres,
                    apellidos: entrega.paciente?.apellidos,
                    edad: entrega.paciente?.edad,
                    paciente: undefined
                }));
                return res.json({ result: resultadoFormateado });
            } else {
                return res.json({ mensaje: "No existen datos registrados", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error en el servidor", error: error.message });
        }
    },

    // POST /entregas
    store: async (req, res) => {
        try {
            const { id_paciente, Fechaentrega, peso, talla, ta, subtotal, descuento, totalapagar } = req.body;

            const nuevaEntrega = await EntregaModel.create({
                id_paciente,
                Fechaentrega,
                peso,
                talla,
                ta,
                subtotal,
                descuento,
                totalapagar,
                entregado: false // Se crea como pendiente; se despacha con actualizarentregado
            });

            return res.json({
                result: "Datos guardados",
                code: '201',
                id: nuevaEntrega.id_entrega
            });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al guardar la entrega", error: error.message });
        }
    },

    // GET /entregas/:id
    show: async (req, res) => {
        try {
            const { id } = req.params;
            const entrega = await EntregaModel.findByPk(id);

            if (entrega) {
                return res.json({ result: entrega });
            } else {
                return res.json({ mensaje: `No se encontró la entrega con ID ${id}`, code: '404' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al buscar la entrega", error: error.message });
        }
    },

    // PUT /entregas/actualizardatosfactura/:id
    actualizardatosfactura: async (req, res) => {
        try {
            const { id } = req.params;
            const { subtotal, descuento, total } = req.body;

            const entrega = await EntregaModel.findByPk(id);

            if (entrega) {
                entrega.subtotal = subtotal;
                entrega.descuento = descuento;
                entrega.totalapagar = total; // En Laravel tenías $request->total asignado a totalapagar
                await entrega.save();

                return res.json({ message: 'Estado del parámetro  actualizado correctamente' });
            } else {
                return res.status(404).json({ message: 'No se encontró el parámetro con el ID proporcionado' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al actualizar factura", error: error.message });
        }
    },

    // PUT /entregas/actualizarentregado/:id
    actualizarentregado: async (req, res) => {
        try {
            const { id } = req.params;
            const entrega = await EntregaModel.findByPk(id);

            if (entrega) {
                entrega.entregado = true;
                await entrega.save();

                return res.json({ message: 'Estado del parámetro  actualizado correctamente' });
            } else {
                return res.status(404).json({ message: 'No se encontró el parámetro con el ID proporcionado' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al actualizar estado", error: error.message });
        }
    }
};