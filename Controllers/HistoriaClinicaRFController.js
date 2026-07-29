import {
    HistoriaClinicaRFModel,
    ContenidoCifradoRFModel,
    MedicoModel,
    PacienteModel,
    CitaModel,
    RolModel,
    DiagnosticoModel,
    TratamientoModel,
    LlaveEccModel
} from '../Models/index.js';
import { AsignacionModel } from '../Models/asignaciones.js';
import { descifrarPaciente } from './PacienteController.js';
import { CryptoService } from '../utils/cryptoService.js';
import {
    obtenerLlavePublicaInstitucional,
    obtenerLlavePrivadaInstitucional,
} from '../utils/institutionalKeys.js';
import { sequelize } from '../db/conexion.js';
import { Op } from 'sequelize';

export const HistoriaClinicaRFController = {

    // POST /historia-rf
    store: async (req, res) => {
        const t = await sequelize.transaction();
        try {
            const {
                id_paciente, id_tratamiento, id_diagnostico, lugar_atencion,
                certificado, motivo_consulta, anamnesis, receta, fecha, edad,
                llavePrivadaPem, grupo_atencion
            } = req.body;

            const id_medico = req.user.id_cuenta;

            if (!llavePrivadaPem) {
                await t.rollback();
                return res.status(400).json({ message: "Se requiere la llave privada del médico para firmar la historia de RF." });
            }

            // Cifrar los bloques médicos narrativos y sensibles (ECDH + AES-256-GCM)
            const datosParaProteger = {
                motivo_consulta, anamnesis, receta,
                fecha_atencion: new Date().toISOString()
            };
            const llavePublicaInstitucional = obtenerLlavePublicaInstitucional();
            const payloadTexto = JSON.stringify(datosParaProteger);
            const contenedorCifrado = CryptoService.cifrarConECDH(payloadTexto, llavePublicaInstitucional);

            const hashIntegridad = CryptoService.calcularHashSHA256(contenedorCifrado);
            const firmaECC = CryptoService.firmarHistoriaClinica(hashIntegridad, llavePrivadaPem);

            // Se guarda la llave PÚBLICA activa del médico junto con el registro,
            // no solo su id, para que el registro siga siendo verificable aunque
            // el médico rote su llave privada más adelante.
            const llaveActivaMedico = await LlaveEccModel.findOne({
                where: { creado_por: id_medico, activa: true },
                order: [['fecha_creacion', 'DESC']],
                transaction: t
            });

            // Persistencia Base
            const nuevaHC = await HistoriaClinicaRFModel.create({
                id_paciente,
                id_tratamiento,
                id_diagnostico,
                id_cuenta_auditoria: id_medico,
                lugar_atencion,
                certificado: certificado || false,
                fecha: fecha || new Date().toISOString().split('T')[0],
                edad,
                firma_ecdsa: firmaECC,
                hash_integridad: hashIntegridad,
                llave_publica_pem: llaveActivaMedico ? llaveActivaMedico.llave_publica_pem : null
            }, { transaction: t });

            // Persistencia Satélite Satélite 1:1
            await ContenidoCifradoRFModel.create({
                id_historia_rf: nuevaHC.id_rf,
                payload_clinico_rf: contenedorCifrado
            }, { transaction: t });

            // Actualizar Paciente
            const paciente = await PacienteModel.findByPk(id_paciente, { transaction: t });
            if (paciente) {
                paciente.grupo_a_prioritaria = grupo_atencion;
                await paciente.save({ transaction: t });
            }

            await t.commit();
            return res.status(201).json({ result: "Datos guardados", code: '201' });

        } catch (error) {
            await t.rollback();
            return res.status(500).json({ mensaje: "Error al guardar historia RF", error: error.message });
        }
    },

    // GET /historia-rf/:id
    show: async (req, res) => {
        try {
            const { id } = req.params;
            const id_medico_consulta = req.user.id_cuenta;

            const hc = await HistoriaClinicaRFModel.findByPk(id, {
                include: [{ model: ContenidoCifradoRFModel, as: 'contenidoCifrado' }]
            });

            if (!hc) return res.status(404).json({ message: "Registro clínico no encontrado." });

            // Ver el comentario equivalente en HistoriaClinicaController.js. Dentro
            // de la misma especialidad, cualquier médico puede LEER el registro
            // de un colega para corroborar antecedentes (nunca editar).
            if (String(hc.id_cuenta_auditoria) !== String(id_medico_consulta)) {
                const rolConsultante = await RolModel.findByPk(req.user?.id_rol);
                const esAdministrador = rolConsultante && rolConsultante.rol === 'Administrador';
                const esMismaEspecialidad = rolConsultante && rolConsultante.rol === 'Rehabilitación Física';

                if (!esAdministrador && !esMismaEspecialidad) {
                    const hoy = new Date().toISOString().split('T')[0];
                    const permisoActivo = await AsignacionModel.findOne({
                        where: {
                            id_medico_titular: hc.id_cuenta_auditoria,
                            id_medico_reemplazo: id_medico_consulta,
                            estado: true,
                            fecha_inicio: { [Op.lte]: hoy },
                            fecha_fin: { [Op.gte]: hoy }
                        }
                    });
                    if (!permisoActivo) return res.status(403).json({ message: "Acceso denegado: No cuenta con asignación o reemplazo legal vigente para auditar este registro." });
                }
            }

            const llavePrivadaInstitucional = obtenerLlavePrivadaInstitucional();
            const datosDescifradosStr = CryptoService.descifrarConECDH(hc.contenidoCifrado.payload_clinico_rf, llavePrivadaInstitucional);

            return res.json({
                result: {
                    ...hc.toJSON(),
                    datos_sensibles: JSON.parse(datosDescifradosStr)
                }
            });
        } catch (error) {
            return res.status(500).json({ message: "Error al recuperar historia", error: error.message });
        }
    },

    // GET /historia-rf/paciente/:id
    ConsultasPacientesRF: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await HistoriaClinicaRFModel.findAll({
                where: { id_paciente: id },
                include: [
                    { model: PacienteModel, as: 'paciente' },
                    { model: DiagnosticoModel, as: 'diagnostico' },
                    { model: TratamientoModel, as: 'tratamientos' }
                ]
            });
            if (datos.length !== 0) return res.json({ result: datos, code: '201' });
            return res.json({ result: "Datos vacios", code: '202' });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    // GET /historia-rf/filtrar/fechas/:fechaInicial/:fechaFinal
    FiltradoFecha: async (req, res) => {
        try {
            const { fechaInicial, fechaFinal } = req.params;
            if (fechaInicial > fechaFinal) return res.json({ result: "Error en fechas", code: '203' });

            const condicion = fechaInicial === fechaFinal ? { fecha: fechaInicial } : { fecha: { [Op.between]: [fechaInicial, fechaFinal] } };

            const datos = await HistoriaClinicaRFModel.findAll({
                where: condicion,
                include: [
                    { model: PacienteModel, as: 'paciente' },
                    { model: TratamientoModel, as: 'tratamientos' },
                    { model: MedicoModel, as: 'medico', attributes: ['nombres'] }
                ]
            });

            const resultado = datos.map((hc) => {
                const hcJSON = hc.toJSON();
                if (hcJSON.paciente) {
                    hcJSON.paciente = descifrarPaciente(hcJSON.paciente);
                }
                return hcJSON;
            });

            if (resultado.length !== 0) return res.json({ result: resultado, code: '201' });
            return res.json({ result: "Datos vacios", code: '202' });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    // GET /historia-rf/estadisticas/:fechaInicial/:fechaFinal/:especialidad
    DatosEstadisticos: async (req, res) => {
        try {
            const { fechaInicial, fechaFinal, especialidad } = req.params;
            const idMedico = req.user.id_cuenta;

            const historiasPropias = await HistoriaClinicaRFModel.findAll({
                where: { fecha: { [Op.between]: [fechaInicial, fechaFinal] }, id_cuenta_auditoria: idMedico }
            });

            let pacientesNuevos = 0, pacientesSeguimiento = 0;
            for (const h of historiasPropias) {
                const primeraConsulta = await HistoriaClinicaRFModel.findOne({
                    where: { id_paciente: h.id_paciente },
                    order: [['fecha', 'ASC'], ['id_rf', 'ASC']]
                });
                if (primeraConsulta && String(primeraConsulta.id_rf) === String(h.id_rf)) pacientesNuevos++;
                else pacientesSeguimiento++;
            }

            // En Rehabilitación Física no se despachan medicamentos de farmacia;
            // el equivalente es el plan terapéutico escrito en cada consulta —
            // ya se cuenta como parte de "pacientesNuevos + pacientesSeguimiento".
            const tratamientosAplicados = historiasPropias.length;

            let citasAtendidas = 0, citasPendientes = 0;
            const citas = await CitaModel.findAll({
                where: { fecha: { [Op.between]: [fechaInicial, fechaFinal] } },
                include: ['turno']
            });
            const roles = await RolModel.findAll();
            citas.forEach(cita => {
                if (cita.turno) {
                    const rol = roles.find(r => r.id_rol === cita.turno.id_rol);
                    if (rol?.rol === especialidad) {
                        if (String(cita.estado) === '1') citasAtendidas++;
                        else citasPendientes++;
                    }
                }
            });

            const hoyStr = new Date().toISOString().split('T')[0];
            let proximaCita = null;
            if (fechaInicial <= hoyStr && hoyStr <= fechaFinal) {
                const citasHoy = citas
                    .filter(c => c.fecha === hoyStr && c.turno && roles.find(r => r.id_rol === c.turno.id_rol)?.rol === especialidad && String(c.estado) !== '1')
                    .sort((a, b) => (a.turno?.hora || '').localeCompare(b.turno?.hora || ''));
                if (citasHoy.length > 0) {
                    proximaCita = { hora: citasHoy[0].turno?.hora, nombres: citasHoy[0].nombres };
                }
            }

            return res.json({
                citasAtendidas,
                citasPendientes,
                pacientesNuevos,
                pacientesSeguimiento,
                tratamientosAplicados,
                proximaCita
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    // GET /rf/historias/verificar/:id -> Verificación forense (hash + firma ECDSA real)
    verificarIntegridad: async (req, res) => {
        try {
            const { id } = req.params;
            const hc = await HistoriaClinicaRFModel.findByPk(id, {
                include: [{ model: ContenidoCifradoRFModel, as: 'contenidoCifrado' }]
            });

            if (!hc || !hc.contenidoCifrado) {
                return res.status(404).json({ message: "Incapacidad de auditoría: Registro o criptograma faltante." });
            }

            const hashCalculado = CryptoService.calcularHashSHA256(hc.contenidoCifrado.payload_clinico_rf);
            const hashIntegro = hashCalculado === hc.hash_integridad;

            let firmaValida = false;
            if (hc.llave_publica_pem && hc.firma_ecdsa) {
                firmaValida = CryptoService.verificarFirma(hc.hash_integridad, hc.firma_ecdsa, hc.llave_publica_pem);
            }

            const integro = hashIntegro && firmaValida;

            if (integro) {
                return res.json({
                    result: "Auditoría Exitosa: El expediente es totalmente íntegro, original y legítimo. Hash verificado y firma ECDSA válida.",
                    code: '201',
                    match: true,
                    detalle: { hash_integro: hashIntegro, firma_valida: firmaValida }
                });
            } else {
                let motivo = [];
                if (!hashIntegro) motivo.push('el contenido cifrado fue alterado (hash no coincide)');
                if (!firmaValida) motivo.push('la firma digital no es válida (no corresponde al médico firmante o al contenido)');
                return res.status(400).json({
                    result: `🚨 ¡ALERTA FORENSE!: ${motivo.join('; ')}.`,
                    code: '202',
                    match: false,
                    detalle: { hash_integro: hashIntegro, firma_valida: firmaValida }
                });
            }
        } catch (error) {
            return res.status(500).json({ message: "Error en el motor de verificación forense", error: error.message });
        }
    },

    // GET /rf/historias/verificar-todas -> Auditoría masiva (solo Administrador)
    // Ver el comentario equivalente en HistoriaClinicaController.js
    verificarTodas: async (req, res) => {
        try {
            const historias = await HistoriaClinicaRFModel.findAll({
                include: [
                    { model: ContenidoCifradoRFModel, as: 'contenidoCifrado' },
                    { model: PacienteModel, as: 'paciente', attributes: ['nombres', 'apellidos'] },
                    { model: MedicoModel, as: 'medico', attributes: ['nombres'] }
                ],
                order: [['fecha', 'DESC']]
            });

            let llavePrivadaInstitucional = null;
            try {
                llavePrivadaInstitucional = obtenerLlavePrivadaInstitucional();
            } catch (e) { /* se reporta por registro si falta */ }

            const resultado = historias.map((hc) => {
                const base = {
                    id_rf: hc.id_rf,
                    fecha: hc.fecha,
                    paciente: hc.paciente ? `${hc.paciente.nombres} ${hc.paciente.apellidos}` : '—',
                    medico: hc.medico?.nombres || '—'
                };

                if (!hc.contenidoCifrado) {
                    return { ...base, estado: 'Sin contenido', detalle: 'No existe el bloque cifrado asociado.' };
                }

                const hashCalculado = CryptoService.calcularHashSHA256(hc.contenidoCifrado.payload_clinico_rf);
                const hashIntegro = hashCalculado === hc.hash_integridad;
                const firmaValida = (hc.llave_publica_pem && hc.firma_ecdsa)
                    ? CryptoService.verificarFirma(hc.hash_integridad, hc.firma_ecdsa, hc.llave_publica_pem)
                    : false;

                if (!hashIntegro || !firmaValida) {
                    const motivo = [];
                    if (!hashIntegro) motivo.push('hash alterado');
                    if (!firmaValida) motivo.push('firma inválida');
                    return { ...base, estado: 'Alterado', detalle: motivo.join(', ') };
                }

                try {
                    if (!llavePrivadaInstitucional) throw new Error('Llave institucional no configurada');
                    CryptoService.descifrarConECDH(hc.contenidoCifrado.payload_clinico_rf, llavePrivadaInstitucional);
                    return { ...base, estado: 'Íntegro', detalle: 'Hash correcto, firma válida, y descifrable con la llave actual.' };
                } catch (e) {
                    return { ...base, estado: 'No descifrable', detalle: 'Hash y firma correctos, pero no se puede leer con la llave institucional actual (posible pérdida de una llave anterior).' };
                }
            });

            const resumen = {
                total: resultado.length,
                integros: resultado.filter(r => r.estado === 'Íntegro').length,
                alterados: resultado.filter(r => r.estado === 'Alterado').length,
                noDescifrables: resultado.filter(r => r.estado === 'No descifrable').length,
                sinContenido: resultado.filter(r => r.estado === 'Sin contenido').length
            };

            return res.json({ resumen, result: resultado });
        } catch (error) {
            return res.status(500).json({ message: "Error en la auditoría masiva", error: error.message });
        }
    }
};