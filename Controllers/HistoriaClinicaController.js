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

            // Validación de Auditoría Interna: Comprobación de Médico Titular o Reemplazo Vigente
            // (Administrador siempre tiene acceso, para soporte y supervisión —
            // igual criterio que en el resto del sistema, ej. Historial Clínico Completo)
            // Comparación normalizada a texto: aunque ambas columnas son BIGINT,
            // dependiendo de la capa (Sequelize, el driver de Postgres, la
            // serialización del JWT) uno de los dos valores puede llegar como
            // string y el otro como number — con "!==" (estricto) eso los
            // trataría como distintos aunque representen la misma cuenta.
            if (String(hc.id_cuenta_auditoria) !== String(id_medico_consulta)) {
                const rolConsultante = await RolModel.findByPk(req.user?.id_rol);
                const esAdministrador = rolConsultante && rolConsultante.rol === 'Administrador';

                if (!esAdministrador) {
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
                    { model: EnfermedadModel, as: 'enfermedad' }
                ]
            });

            if (datos.length !== 0) return res.json({ result: datos, code: '201' });
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

            const historias = await HistoriaClinicaMGModel.findAll({
                where: { fecha: { [Op.between]: [fechaInicial, fechaFinal] } },
                include: [{ model: PacienteModel, as: 'paciente' }]
            });

            let presunt = 0, defini = 0, cont = 0, contH = 0, contM = 0;
            const diaslab = [];

            historias.forEach(item => {
                if (item.condicion_diagnostico === 'Presuntivo') presunt++;
                else defini++;

                if (item.paciente?.gad === true) cont++;
                if (item.paciente?.sexo === 'Hombre') contH++;
                if (item.paciente?.sexo === 'Mujer') contM++;
                if (!diaslab.includes(item.fecha)) diaslab.push(item.fecha);
            });

            let TotalcitasPendientes = 0;
            const citas = await CitaModel.findAll({ include: ['turno'] });
            const roles = await RolModel.findAll(); // <-- Corregido de RoleModel a RolModel

            citas.forEach(cita => {
                if (cita.turno) {
                    const rol = roles.find(r => r.id_rol === cita.turno.id_rol); // <-- Corregido de id_role a id_rol
                    if (rol?.rol === especialidad) TotalcitasPendientes++;
                }
            });

            return res.json({
                totalP: historias.length,
                totalC: TotalcitasPendientes,
                totalG: cont,
                totalH: contH,
                totalM: contM,
                presuntivo: presunt,
                definitivo: defini,
                horas: diaslab.length
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
    }
};