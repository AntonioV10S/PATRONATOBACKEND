import { ExamenComplementarioModel, PacienteModel } from '../Models/index.js';
import { CryptoService } from '../utils/cryptoService.js';
import { obtenerLlavePublicaInstitucional, obtenerLlavePrivadaInstitucional } from '../utils/institutionalKeys.js';

// Antes: el controlador esperaba que el FRONTEND enviara una "llave_publica_medico"
// y llamaba a CryptoService.cifrarConECC, un método que nunca existió. La
// condición `CryptoService.cifrarConECC` era siempre `undefined` (falsy), así
// que la rama de cifrado JAMÁS se ejecutaba: los reportes de laboratorio,
// electrocardiograma y radiografía se guardaban siempre en texto plano sin
// ningún aviso de error. Ahora se cifra siempre, contra la llave institucional,
// igual que el resto de contenido clínico sensible.

function cifrarCampo(valor) {
    if (!valor) return valor;
    const llavePublica = obtenerLlavePublicaInstitucional();
    return CryptoService.cifrarConECDH(String(valor), llavePublica);
}

function descifrarCampo(valorCifrado) {
    if (!valorCifrado) return valorCifrado;
    try {
        const llavePrivada = obtenerLlavePrivadaInstitucional();
        return CryptoService.descifrarConECDH(valorCifrado, llavePrivada);
    } catch (e) {
        return '[No se pudo descifrar]';
    }
}

function descifrarRegistro(registroJSON) {
    return {
        ...registroJSON,
        laboratorio: descifrarCampo(registroJSON.laboratorio),
        electrocardiograma: descifrarCampo(registroJSON.electrocardiograma),
        radiografia_torax: descifrarCampo(registroJSON.radiografia_torax),
        otros: descifrarCampo(registroJSON.otros),
    };
}

export const ExamenesComplementarioController = {
    index: async (req, res) => {
        try {
            const datos = await ExamenComplementarioModel.findAll();
            if (datos.length !== 0) {
                return res.json({ result: datos.map((d) => descifrarRegistro(d.toJSON())) });
            } else {
                return res.json({ mensaje: "No existen datos registrados", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error en el servidor", error: error.message });
        }
    },

    store: async (req, res) => {
        try {
            const { laboratorio, electrocardiograma, radiografia_torax, otros, id_paciente } = req.body;

            const datos = await ExamenComplementarioModel.create({
                laboratorio: cifrarCampo(laboratorio),
                electrocardiograma: cifrarCampo(electrocardiograma),
                radiografia_torax: cifrarCampo(radiografia_torax),
                otros: cifrarCampo(otros),
            });

            // Vincula el examen recién creado al paciente (relación 1:1 vía
            // pacientes.id_e_complementario). Sin esto, el examen quedaba
            // huérfano: nunca aparecía asociado a ningún paciente.
            if (id_paciente) {
                const paciente = await PacienteModel.findByPk(id_paciente);
                if (paciente) {
                    paciente.id_e_complementario = datos.id_e_complementario;
                    await paciente.save();
                }
            }

            return res.json({
                result: "Datos guardados",
                code: '201',
                id: datos.id_e_complementario
            });
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al guardar", error: error.message });
        }
    },

    show: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await ExamenComplementarioModel.findOne({
                where: { id_e_complementario: id }
            });

            if (datos !== null) {
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
            const { laboratorio, electrocardiograma, radiografia_torax, otros } = req.body;

            const datos = await ExamenComplementarioModel.findOne({
                where: { id_e_complementario: id }
            });

            if (datos !== null) {
                if (laboratorio !== undefined) datos.laboratorio = cifrarCampo(laboratorio);
                if (electrocardiograma !== undefined) datos.electrocardiograma = cifrarCampo(electrocardiograma);
                if (radiografia_torax !== undefined) datos.radiografia_torax = cifrarCampo(radiografia_torax);
                if (otros !== undefined) datos.otros = cifrarCampo(otros);

                await datos.save();
                return res.json({ mensaje: "Dato Actualizado.", code: '201' });
            } else {
                return res.json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al actualizar", error: error.message });
        }
    },

    // GET /clinico/examenes-complementarios/paciente/:id_paciente
    porPaciente: async (req, res) => {
        try {
            const { id_paciente } = req.params;
            const paciente = await PacienteModel.findByPk(id_paciente);

            if (!paciente || !paciente.id_e_complementario) {
                return res.json({ mensaje: "Este paciente aún no tiene exámenes complementarios registrados", code: '202' });
            }

            const datos = await ExamenComplementarioModel.findOne({
                where: { id_e_complementario: paciente.id_e_complementario }
            });

            if (datos !== null) {
                return res.json({ result: descifrarRegistro(datos.toJSON()) });
            } else {
                return res.json({ mensaje: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ mensaje: "Error al buscar", error: error.message });
        }
    },

    destroy: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await ExamenComplementarioModel.findOne({
                where: { id_e_complementario: id }
            });

            if (datos !== null) {
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
