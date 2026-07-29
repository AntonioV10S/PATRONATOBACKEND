import { AntecedentePatologicoPersonalModel, PacienteModel, AntecedenteGinecoModel } from '../Models/index.js';
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
        resultado.alergias = resultado.alergias_enc
            ? CryptoService.descifrarDatos(resultado.alergias_enc, clave)
            : null;
        resultado.traumas = resultado.traumas_enc
            ? CryptoService.descifrarDatos(resultado.traumas_enc, clave)
            : null;
    } catch (e) {
        resultado.alergias = '[No se pudo descifrar]';
        resultado.traumas = '[No se pudo descifrar]';
    }
    delete resultado.alergias_enc;
    delete resultado.traumas_enc;
    return resultado;
}

export const AntecedentesPatologicosPersonalesController = {
    index: async (req, res) => {
        try {
            const datos = await AntecedentePatologicoPersonalModel.findAll({
                include: [
                    { model: PacienteModel, as: 'pacientes' },
                    { model: AntecedenteGinecoModel, as: 'antecedentes_ginecos_obstretico' }
                ]
            });
            if (datos.length !== 0) {
                return res.json({ result: datos.map((d) => descifrarRegistro(d.toJSON())) });
            } else {
                return res.json({ mensaje: "No existen datos registrados", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al listar", error: error.message });
        }
    },

    store: async (req, res) => {
        try {
            const { id_gineco, infancia, adolecencia, adultez, DBID, HTA, TbP, DBI, quirujircos, alergias, traumas, id_paciente } = req.body;
            const clave = obtenerClavePersonal();

            const datos = await AntecedentePatologicoPersonalModel.create({
                id_gineco, infancia, adolecencia, adultez, DBID, HTA, TbP, DBI, quirujircos,
                alergias_enc: alergias ? CryptoService.cifrarDatos(String(alergias), clave) : null,
                traumas_enc: traumas ? CryptoService.cifrarDatos(String(traumas), clave) : null,
            });

            // Vincula el registro recién creado al paciente (pacientes.id_patologico).
            if (id_paciente) {
                const paciente = await PacienteModel.findByPk(id_paciente);
                if (paciente) {
                    paciente.id_patologico = datos.id_patologico;
                    await paciente.save();
                }
            }

            return res.json({ result: "Datos guardados", code: '201', id: datos.id_patologico });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al guardar", error: error.message });
        }
    },

    show: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await AntecedentePatologicoPersonalModel.findOne({ where: { id_patologico: id } });
            if (datos) {
                return res.json({ result: descifrarRegistro(datos.toJSON()) });
            } else {
                return res.json({ mensaje: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al buscar", error: error.message });
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { id_gineco, infancia, adolecencia, adultez, DBID, HTA, TbP, DBI, quirujircos, alergias, traumas } = req.body;
            const clave = obtenerClavePersonal();

            const datos = await AntecedentePatologicoPersonalModel.findByPk(id);
            if (datos) {
                datos.id_gineco = id_gineco;
                datos.infancia = infancia;
                datos.adolecencia = adolecencia;
                datos.adultez = adultez;
                datos.DBID = DBID;
                datos.HTA = HTA;
                datos.TbP = TbP;
                datos.DBI = DBI;
                datos.quirujircos = quirujircos;
                if (alergias !== undefined) datos.alergias_enc = alergias ? CryptoService.cifrarDatos(String(alergias), clave) : null;
                if (traumas !== undefined) datos.traumas_enc = traumas ? CryptoService.cifrarDatos(String(traumas), clave) : null;
                await datos.save();

                return res.json({ mensaje: "Dato Actualizado.", code: '201' });
            }
            return res.json({ mensaje: "Registro no encontrado", code: '202' });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al actualizar", error: error.message });
        }
    },

    destroy: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await AntecedentePatologicoPersonalModel.findOne({ where: { id_patologico: id } });
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
