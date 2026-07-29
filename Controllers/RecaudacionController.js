import { RecaudacionModel, PacienteModel, RolModel } from '../Models/index.js';
import { CryptoService } from '../utils/cryptoService.js';

function obtenerClavePersonal() {
    if (!process.env.DATOS_PERSONALES_SECRET_KEY) {
        throw new Error('DATOS_PERSONALES_SECRET_KEY no está configurada en las variables de entorno.');
    }
    return process.env.DATOS_PERSONALES_SECRET_KEY;
}

function descifrarRegistro(registroJSON) {
    const clave = obtenerClavePersonal();
    const resultado = { ...registroJSON };
    try {
        resultado.valor = resultado.valor_enc
            ? CryptoService.descifrarDatos(resultado.valor_enc, clave)
            : null;
    } catch (e) {
        resultado.valor = '[No se pudo descifrar]';
    }
    delete resultado.valor_enc;
    return resultado;
}

export const RecaudacionController = {
    // GET /recaudaciones
    listarRecaudaciones: async (req, res) => {
        try {
            const datos = await RecaudacionModel.findAll({
                include: [
                    { model: PacienteModel, as: 'paciente' },
                    { model: RolModel, as: 'rol' }
                ]
            });
            const num_rows = datos.length;

            if (num_rows !== 0) {
                return res.json({ result: datos.map((d) => descifrarRegistro(d.toJSON())), code: '201', total: num_rows });
            } else {
                return res.json({ mensaje: "No hay registros", code: '202' });
            }
        } catch (error) {
            res.status(500).json({ message: "Error al listar recaudaciones", error: error.message });
        }
    },

    // POST /recaudaciones
    crearRecaudacion: async (req, res) => {
        try {
            const clave = obtenerClavePersonal();
            await RecaudacionModel.create({
                id_paciente: req.body.id_paciente,
                id_rol: req.body.id_rol,
                id_cuenta_auditoria: req.user?.id_cuenta,
                fecha: req.body.fecha,
                valor_enc: CryptoService.cifrarDatos(String(req.body.valor), clave),
                exonera: req.body.exonera,
                observaciones: req.body.observaciones
            });

            return res.json({ result: "Datos guardados", code: '201' });
        } catch (error) {
            res.status(400).json({ message: "Error al registrar recaudación", error: error.message });
        }
    },

    // GET /recaudaciones/:id_recaudacion
    obtenerRecaudacionPorId: async (req, res) => {
        try {
            const { id_recaudacion } = req.params;
            const datos = await RecaudacionModel.findOne({
                where: { id_recaudacion },
                include: [
                    { model: PacienteModel, as: 'paciente' },
                    { model: RolModel, as: 'rol' }
                ]
            });

            if (datos) {
                return res.json({ result: descifrarRegistro(datos.toJSON()), code: '201' });
            } else {
                return res.json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            res.status(500).json({ message: "Error al obtener recaudación", error: error.message });
        }
    },

    // DELETE /recaudaciones/:id_recaudacion
    eliminarRecaudacion: async (req, res) => {
        try {
            const { id_recaudacion } = req.params;
            const datos = await RecaudacionModel.findOne({ where: { id_recaudacion } });

            if (datos) {
                await datos.destroy();
                return res.json({ result: "Dato Eliminado", code: '201' });
            } else {
                return res.json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            res.status(500).json({ message: "Error al eliminar recaudación", error: error.message });
        }
    }
};
