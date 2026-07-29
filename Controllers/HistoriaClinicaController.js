import {
    HistoriaClinicaMGModel,
    ContenidoCifradoMGModel,
    MedicoModel,
    PacienteModel,
    CitaModel,
    RolModel,
    EnfermedadModel,
    LlaveEccModel
} from '../Models/index.js';
import { AsignacionModel } from '../Models/asignaciones.js'; // Asegúrate de que este archivo exista en tu carpeta Models
import { descifrarPaciente } from './PacienteController.js';
import { EntregaModel } from '../Models/entrega.js';
import { CryptoService } from '../utils/cryptoService.js';
import {
    obtenerLlavePublicaInstitucional,
    obtenerLlavePrivadaInstitucional,
} from '../utils/institutionalKeys.js';
import { sequelize } from '../db/conexion.js';
import { Op } from 'sequelize';

export const HistoriaClinicaMGController = {

    crearHistoria: async (req, res) => {
        const t = await sequelize.transaction();
        try {
            const {
                id_paciente, id_enfermedad, motivo, diagnostico, plan_terapeutico,
                lugar_atencion, certificado, edad, llavePrivadaPem, tipo_atencion,
                condicion_diagnostico, grupo_atencion
            } = req.body;

            const id_medico = req.user.id_cuenta; // Extraído de forma segura del middleware verificarToken

            if (!llavePrivadaPem) {
                await t.rollback();
                return res.status(400).json({
                    message: "Requerido: Se necesita la llave privada del médico firmante para generar el bloque ECDSA."
                });
            }

            // 1. Cifrado ASIMÉTRICO del Payload Clínico Sensible (ECDH + AES-256-GCM)
            //    Solo quien posea la llave privada institucional puede descifrar esto,
            //    incluso si la base de datos completa es robada.
            const datosParaProteger = {
                motivo, diagnostico, plan_terapeutico,
                fecha_atencion: new Date().toISOString()
            };
            const llavePublicaInstitucional = obtenerLlavePublicaInstitucional();
            const payloadTexto = JSON.stringify(datosParaProteger);
            const contenedorCifrado = CryptoService.cifrarConECDH(payloadTexto, llavePublicaInstitucional);

            // 2. Firma Digital de Integridad Estructural (ECDSA con SHA-256)
            const hashIntegridad = CryptoService.calcularHashSHA256(contenedorCifrado);
            const firmaECC = CryptoService.firmarHistoriaClinica(hashIntegridad, llavePrivadaPem);

            // Se guarda la llave PÚBLICA activa del médico junto con el registro
            // (no solo su id). Así, si la llave se rota más adelante (por
            // pérdida de la privada), este registro sigue siendo verificable
            // para siempre contra la llave que realmente se usó para firmarlo.
            const llaveActivaMedico = await LlaveEccModel.findOne({
                where: { creado_por: id_medico, activa: true },
                order: [['fecha_creacion', 'DESC']],
                transaction: t
            });

            // 3. Persistencia de Metadata en la Tabla Principal
            const nuevaHC = await HistoriaClinicaMGModel.create({
                id_paciente,
                id_enfermedad,
                id_cuenta_auditoria: id_medico,
                fecha: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
                tipo_atencion: tipo_atencion || 'Consulta General',
                condicion_diagnostico: condicion_diagnostico || 'Presuntivo',
                lugar_atencion,
                certificado: certificado || false,
                edad,
                firma_ecdsa: firmaECC,
                hash_integridad: hashIntegridad,
                llave_publica_pem: llaveActivaMedico ? llaveActivaMedico.llave_publica_pem : null
            }, { transaction: t });

            // 4. Persistencia del Criptograma Seguro en Tabla Satélite (Garantiza Relación 1:1)
            await ContenidoCifradoMGModel.create({
                id_historia_mg: nuevaHC.id_historia_mg,
                payload_clinico_mg: contenedorCifrado
            }, { transaction: t });

            // 5. Actualización Dinámica del Grupo Prioritario del Paciente
            const paciente = await PacienteModel.findByPk(id_paciente, { transaction: t });
            if (paciente) {
                paciente.grupo_a_prioritaria = grupo_atencion;
                await paciente.save({ transaction: t });
            }

            await t.commit();
            return res.status(201).json({
                result: "Datos guardados bajo resguardo criptográfico exitosamente.",
                code: '201',
                id_registro: nuevaHC.id_historia_mg
            });

        } catch (error) {
            await t.rollback();
            return res.status(500).json({ mensaje: "Error crítico al guardar expediente", error: error.message });
        }
    },

    // =========================================================================
    // GET /mg/historias/:id -> Descifrado en Tiempo de Ejecución y RBAC con Reemplazos
    // =========================================================================
    obtenerHistoria: async (req, res) => {
        try {
            const { id } = req.params;
            const id_medico_consulta = req.user.id_cuenta;

            const hc = await HistoriaClinicaMGModel.findByPk(id, {
                include: [{ model: ContenidoCifradoMGModel, as: 'contenidoCifrado' }]
            });

            if (!hc) return res.status(404).json({ message: "Registro clínico no encontrado en el sistema." });

            // Validación de Auditoría Interna: Comprobación de Médico Titular,
            // colega de la misma especialidad, Reemplazo Vigente, o Administrador.
            // Comparación normalizada a texto: aunque ambas columnas son BIGINT,
            // dependiendo de la capa (Sequelize, el driver de Postgres, la
            // serialización del JWT) uno de los dos valores puede llegar como
            // string y el otro como number — con "!==" (estricto) eso los
            // trataría como distintos aunque representen la misma cuenta.
            if (String(hc.id_cuenta_auditoria) !== String(id_medico_consulta)) {
                const rolConsultante = await RolModel.findByPk(req.user?.id_rol);
                const esAdministrador = rolConsultante && rolConsultante.rol === 'Administrador';
                // Dentro de la misma especialidad, cualquier médico puede LEER el
                // registro de un colega para corroborar antecedentes del paciente
                // (nunca editar — no existe endpoint de edición). Entre
                // especialidades distintas, se exige una asignación de reemplazo
                // formal, igual que antes.
                const esMismaEspecialidad = rolConsultante && rolConsultante.rol === 'Medicina General';

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

                    if (!permisoActivo) {
                        return res.status(403).json({
                            message: "Acceso denegado: No cuenta con asignación o reemplazo legal vigente para auditar este registro."
                        });
                    }
                }
            }

            if (!hc.contenidoCifrado) {
                return res.status(404).json({ message: "Fallo catastrófico de integridad: Contenedor cifrado inexistente." });
            }

            // Descifrado dinámico del payload sensible (ECDH con la llave privada institucional)
            const llavePrivadaInstitucional = obtenerLlavePrivadaInstitucional();
            const datosDescifradosStr = CryptoService.descifrarConECDH(hc.contenidoCifrado.payload_clinico_mg, llavePrivadaInstitucional);
            const datosMedicos = JSON.parse(datosDescifradosStr);

            return res.json({
                result: {
                    ...hc.toJSON(),
                    datos_sensibles: datosMedicos
                },
                code: '201'
            });
        } catch (error) {
            return res.status(500).json({ message: "Error al recuperar e interpretar el registro", error: error.message });
        }
    },

    // =========================================================================
    // GET /mg/pacientes/consultas/:id -> Historial Clínico de Medicina General
    // =========================================================================
    ConsultasPacientesMG: async (req, res) => {
        try {
            const { id } = req.params;
            const datos = await HistoriaClinicaMGModel.findAll({
                where: { id_paciente: id },
                include: [
                    { model: PacienteModel, as: 'paciente' },
                    { model: EnfermedadModel, as: 'enfermedad' }
                ]
            });

            if (datos.length !== 0) return res.json({ result: datos, code: '201' });
            return res.json({ result: "No se encontraron consultas registradas para este paciente.", code: '202' });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    // =========================================================================
    // GET /rf/pacientes/consultas/:id -> Historial de Rehabilitación Física (Simulado / Espejo)
    // =========================================================================
    ConsultasPacientesRF: async (req, res) => {
        try {
            const { id } = req.params;
            return res.json({ result: "Hoja de ruta RF vacía.", code: '202' });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    // =========================================================================
    // GET /mg/historias/rango/:fechaInicial/:fechaFinal -> Filtrado Temporal
    // =========================================================================
    FiltradoFechaMG: async (req, res) => {
        try {
            const { fechaInicial, fechaFinal } = req.params;
            if (fechaInicial > fechaFinal) {
                return res.json({ result: "Error semántico: La fecha inicial no puede ser superior a la final.", code: '203' });
            }

            const condicion = fechaInicial === fechaFinal ? { fecha: fechaInicial } : { fecha: { [Op.between]: [fechaInicial, fechaFinal] } };

            const datos = await HistoriaClinicaMGModel.findAll({
                where: condicion,
                include: [
                    { model: PacienteModel, as: 'paciente' },
                    { model: EnfermedadModel, as: 'enfermedad' },
                    { model: MedicoModel, as: 'medico', attributes: ['nombres'] }
                ]
            });

            // Se descifra la cédula de cada paciente para que la búsqueda por
            // número funcione en el frontend (la lista solo trae los campos
            // ya descifrados que necesita mostrar, nunca el criptograma crudo).
            const resultado = datos.map((hc) => {
                const hcJSON = hc.toJSON();
                if (hcJSON.paciente) {
                    hcJSON.paciente = descifrarPaciente(hcJSON.paciente);
                }
                return hcJSON;
            });

            if (resultado.length !== 0) return res.json({ result: resultado, code: '201' });
            return res.json({ result: "Sin registros clínicos dentro del rango temporal establecido.", code: '202' });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    // =========================================================================
    // GET /mg/estadisticas/:fechaInicial/:fechaFinal/:especialidad -> Métricas Globales
    // =========================================================================
    DatosEstadisticosMG: async (req, res) => {
        try {
            const { fechaInicial, fechaFinal, especialidad } = req.params;
            const idMedico = req.user.id_cuenta;

            // Métricas PERSONALES (propias de este médico): pacientes nuevos vs
            // seguimiento, y recetas emitidas. Se filtran a lo que él mismo
            // atendió, no al total del sistema.
            const historiasPropias = await HistoriaClinicaMGModel.findAll({
                where: { fecha: { [Op.between]: [fechaInicial, fechaFinal] }, id_cuenta_auditoria: idMedico }
            });

            let pacientesNuevos = 0, pacientesSeguimiento = 0;
            for (const h of historiasPropias) {
                // "Nuevo" = esta es la primera consulta de este paciente en todo
                // el sistema (con cualquier médico); "seguimiento" = ya tenía
                // historial previo antes de esta fecha.
                const primeraConsulta = await HistoriaClinicaMGModel.findOne({
                    where: { id_paciente: h.id_paciente },
                    order: [['fecha', 'ASC'], ['id_historia_mg', 'ASC']]
                });
                if (primeraConsulta && String(primeraConsulta.id_historia_mg) === String(h.id_historia_mg)) pacientesNuevos++;
                else pacientesSeguimiento++;
            }

            const idsPacientesAtendidos = [...new Set(historiasPropias.map(h => h.id_paciente))];
            const recetasEmitidas = idsPacientesAtendidos.length === 0 ? 0 : await EntregaModel.count({
                where: {
                    id_paciente: idsPacientesAtendidos,
                    Fechaentrega: { [Op.between]: [fechaInicial, fechaFinal] }
                }
            });

            // Métricas de CITAS: la cola de turnos es compartida por especialidad
            // (cualquier médico de esa especialidad puede atenderlas), así que
            // aquí sí se cuenta el total de la especialidad, no solo de este médico.
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

            // Próxima cita del día de hoy para esta especialidad (informativo,
            // no exclusivo de este médico, ya que la cola es compartida).
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
                recetasEmitidas,
                proximaCita
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    // =========================================================================
    // GET /mg/historias/verificar/:id -> Núcleo Forense: Verificación de Inmutabilidad
    // =========================================================================
    verificarIntegridad: async (req, res) => {
        try {
            const { id } = req.params;
            const hc = await HistoriaClinicaMGModel.findByPk(id, {
                include: [{ model: ContenidoCifradoMGModel, as: 'contenidoCifrado' }]
            });

            if (!hc || !hc.contenidoCifrado) {
                return res.status(404).json({ message: "Incapacidad de auditoría: Registro o criptograma faltante." });
            }

            // 1. Recálculo del Hash SHA256 en tiempo real sobre el bloque de la base de datos
            const hashCalculado = CryptoService.calcularHashSHA256(hc.contenidoCifrado.payload_clinico_mg);
            const hashIntegro = hashCalculado === hc.hash_integridad;

            // 2. Verificación real de la firma ECDSA contra la llave pública del
            //    médico guardada en el propio registro (no la llave "actual" de
            //    su cuenta, para que la verificación no se rompa si el médico
            //    rotó su llave después de firmar este registro).
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

    // =========================================================================
    // GET /mg/historias/verificar-todas -> Auditoría masiva (solo Administrador)
    // Comprueba, para CADA historia clínica: (a) hash y firma intactos, y
    // (b) si el contenido realmente se puede DESCIFRAR con la llave privada
    // institucional actual. Este segundo punto es el que "verificarIntegridad"
    // individual no cubre — un registro puede tener hash y firma perfectos y
    // aun así ser ilegible si la llave institucional cambió después de crearlo
    // (ej. por pérdida del archivo .pem, como ya pasó en este proyecto).
    // No expone contenido clínico, solo el resultado de la auditoría por registro.
    // =========================================================================
    verificarTodas: async (req, res) => {
        try {
            const historias = await HistoriaClinicaMGModel.findAll({
                include: [
                    { model: ContenidoCifradoMGModel, as: 'contenidoCifrado' },
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
                    id_historia_mg: hc.id_historia_mg,
                    fecha: hc.fecha,
                    paciente: hc.paciente ? `${hc.paciente.nombres} ${hc.paciente.apellidos}` : '—',
                    medico: hc.medico?.nombres || '—'
                };

                if (!hc.contenidoCifrado) {
                    return { ...base, estado: 'Sin contenido', detalle: 'No existe el bloque cifrado asociado.' };
                }

                const hashCalculado = CryptoService.calcularHashSHA256(hc.contenidoCifrado.payload_clinico_mg);
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

                // Hash y firma están bien; ahora se intenta descifrar de verdad
                // con la llave institucional actual.
                try {
                    if (!llavePrivadaInstitucional) throw new Error('Llave institucional no configurada');
                    CryptoService.descifrarConECDH(hc.contenidoCifrado.payload_clinico_mg, llavePrivadaInstitucional);
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