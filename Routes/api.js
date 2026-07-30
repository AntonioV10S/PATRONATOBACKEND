import { Router } from 'express';
import { verificarToken } from '../middleware/auth.js';
import { verificarAdmin } from '../middleware/verificarAdmin.js';
import { verificarRol } from '../middleware/verificarRol.js';

// --- IMPORTACIÓN DE CONTROLADORES ---
import { AdquisicionController } from '../Controllers/AdquisicionController.js';
import { AntecedenteEnfermedadController } from '../Controllers/AntecedenteEnfermedadController.js';
import { AntecedentePatologicoFamiliarController } from '../Controllers/AntecedentePatologicoFamiliarController.js';
import { AntecedentesGinecosObstreticoController } from '../Controllers/AntecedentesGinecosObstreticoController.js';
import { AntecedentesPatologicosPersonalesController } from '../Controllers/AntecedentesPatologicosPersonalesController.js';
import { CategoriamedicamentosController } from '../Controllers/CategoriamedicamentosController.js';
import { CitaController } from '../Controllers/CitaController.js';
import { CuentaController } from '../Controllers/CuentaController.js';
import { DetalleAdquisicionController } from '../Controllers/DetalleAdquisicionController.js';
import { DetalleEntregasController } from '../Controllers/DetalleEntregasController.js';
import { InventarioController } from '../Controllers/InventarioController.js';
import { DiagnosticoController } from '../Controllers/DiagnosticoController.js';
import { EgresoController } from '../Controllers/EgresoController.js';
import { EnfermedadController } from '../Controllers/EnfermedadController.js';
import { EntregasController } from '../Controllers/EntregasController.js';
import { ExamenesComplementarioController } from '../Controllers/ExamenesComplementarioController.js';
import { ExamenFisicoController } from '../Controllers/ExamenFisicoController.js';
import { ExamenOrganoSistemaController } from '../Controllers/ExamenOrganoSistemaController.js';
import { FamiliaController } from '../Controllers/FamiliaController.js';
import { HabitoController } from '../Controllers/HabitoController.js';
import { HistoriaClinicaMGController } from '../Controllers/HistoriaClinicaController.js';
import { HistoriaClinicaRFController } from '../Controllers/HistoriaClinicaRFController.js';
import { LaboratoriosController } from '../Controllers/LaboratoriosController.js';
import { MedicamentosController } from '../Controllers/MedicamentosController.js';
import { PacienteController } from '../Controllers/PacienteController.js';
import { ParametrosController } from '../Controllers/ParametrosController.js';
import { RecaudacionController } from '../Controllers/RecaudacionController.js';
import { RoleController } from '../Controllers/RoleController.js';
import { TratamientoController } from '../Controllers/TratamientoController.js';
import { TurnoController } from '../Controllers/TurnoController.js';
import { PDFController } from '../Controllers/pdfController.js';
import { IncidenteSeguridadController } from '../Controllers/IncidenteSeguridadController.js';
import { SolicitudArcoController } from '../Controllers/SolicitudArcoController.js';

export const ApiRouter = Router();

// MÓDULO: ADQUISICIONES Y LOGÍSTICA
ApiRouter.get('/adquisiciones', verificarToken, AdquisicionController.index);
ApiRouter.post('/adquisiciones', verificarToken, verificarRol(['Farmacia']), AdquisicionController.store);

ApiRouter.get('/detalle-adquisicion', verificarToken, DetalleAdquisicionController.index);
ApiRouter.post('/detalle-adquisicion', verificarToken, DetalleAdquisicionController.store);

// MÓDULO: HISTORIALES ANTECEDENTES DEL PACIENTE
ApiRouter.post('/antecedentes/enfermedad', verificarToken, AntecedenteEnfermedadController.store);
ApiRouter.get('/antecedentes/enfermedad/:id', verificarToken, AntecedenteEnfermedadController.show);
ApiRouter.put('/antecedentes/enfermedad/:id', verificarToken, AntecedenteEnfermedadController.update);
ApiRouter.delete('/antecedentes/enfermedad/:id', verificarToken, AntecedenteEnfermedadController.destroy);

ApiRouter.post('/antecedentes/patologico-familiar', verificarToken, verificarRol(['Secretaría']), AntecedentePatologicoFamiliarController.store);
ApiRouter.post('/antecedentes/familiar-nuevo', verificarToken, verificarRol(['Secretaría']), AntecedentePatologicoFamiliarController.crearYVincular);
ApiRouter.get('/antecedentes/familiares-paciente/:id_paciente', verificarToken, AntecedentePatologicoFamiliarController.listarPorPaciente);
ApiRouter.get('/antecedentes/patologico-familiar/:id', verificarToken, AntecedentePatologicoFamiliarController.show);
ApiRouter.delete('/antecedentes/patologico-familiar/:id_familiar/:id_paciente', verificarToken, verificarRol(['Secretaría']), AntecedentePatologicoFamiliarController.eliminar);

ApiRouter.get('/antecedentes/gineco-obstetrico', verificarToken, AntecedentesGinecosObstreticoController.index);
ApiRouter.post('/antecedentes/gineco-obstetrico', verificarToken, verificarRol(['Secretaría']), AntecedentesGinecosObstreticoController.store);
ApiRouter.get('/antecedentes/gineco-obstetrico/:id', verificarToken, AntecedentesGinecosObstreticoController.show);
ApiRouter.put('/antecedentes/gineco-obstetrico/:id', verificarToken, verificarRol(['Secretaría']), AntecedentesGinecosObstreticoController.update);
ApiRouter.delete('/antecedentes/gineco-obstetrico/:id', verificarToken, verificarRol(['Secretaría']), AntecedentesGinecosObstreticoController.destroy);

ApiRouter.get('/antecedentes/patologico-personal', verificarToken, AntecedentesPatologicosPersonalesController.index);
ApiRouter.post('/antecedentes/patologico-personal', verificarToken, verificarRol(['Secretaría']), AntecedentesPatologicosPersonalesController.store);
ApiRouter.get('/antecedentes/patologico-personal/:id', verificarToken, AntecedentesPatologicosPersonalesController.show);
ApiRouter.put('/antecedentes/patologico-personal/:id', verificarToken, verificarRol(['Secretaría']), AntecedentesPatologicosPersonalesController.update);
ApiRouter.delete('/antecedentes/patologico-personal/:id', verificarToken, verificarRol(['Secretaría']), AntecedentesPatologicosPersonalesController.destroy);

ApiRouter.get('/pacientes/habito', verificarToken, HabitoController.index);
ApiRouter.post('/pacientes/habito', verificarToken, verificarRol(['Secretaría']), HabitoController.store);
ApiRouter.get('/pacientes/habito/:id', verificarToken, HabitoController.show);
ApiRouter.put('/pacientes/habito/:id', verificarToken, verificarRol(['Secretaría']), HabitoController.update);
ApiRouter.delete('/pacientes/habito/:id', verificarToken, HabitoController.destroy);

ApiRouter.get('/pacientes/familia', verificarToken, FamiliaController.index);
ApiRouter.post('/pacientes/familia', verificarToken, FamiliaController.store);
ApiRouter.get('/pacientes/familia/:id_familiar', verificarToken, FamiliaController.show);
ApiRouter.put('/pacientes/familia/:id_familiar', verificarToken, FamiliaController.update);
ApiRouter.delete('/pacientes/familia/:id_familiar', verificarToken, FamiliaController.destroy);

// MÓDULO: FARMACIA VADEMÉCUM
ApiRouter.get('/farmacia/categorias', verificarToken, CategoriamedicamentosController.index);
ApiRouter.get('/farmacia/laboratorios', verificarToken, LaboratoriosController.index);
ApiRouter.post('/farmacia/laboratorios', verificarToken, verificarRol(['Farmacia']), LaboratoriosController.store);
ApiRouter.get('/farmacia/medicamentos', verificarToken, MedicamentosController.index);
ApiRouter.post('/farmacia/medicamentos', verificarToken, verificarRol(['Farmacia']), MedicamentosController.store);

// Entregas de Medicación e Inventario
ApiRouter.get('/farmacia/entregas/entregadas', verificarToken, EntregasController.entregadas);
ApiRouter.get('/farmacia/entregas/recientes-u10', verificarToken, EntregasController.entregadasu10);
ApiRouter.put('/farmacia/entregas/factura/:id', verificarToken, verificarRol(['Farmacia']), EntregasController.actualizardatosfactura);
ApiRouter.put('/farmacia/entregas/despachar/:id', verificarToken, verificarRol(['Farmacia']), EntregasController.actualizarentregado);
ApiRouter.get('/farmacia/entregas', verificarToken, EntregasController.index);
ApiRouter.post('/farmacia/entregas', verificarToken, verificarRol(['Farmacia', 'Medicina General']), EntregasController.store);
ApiRouter.get('/farmacia/entregas/:id', verificarToken, EntregasController.show);

ApiRouter.get('/farmacia/detalle-entrega/por-entrega/:id', verificarToken, DetalleEntregasController.datosporidentrega);
ApiRouter.get('/farmacia/detalle-entrega/medicamentos/:id_entrega', verificarToken, DetalleEntregasController.medicamentosporidentrega);
ApiRouter.post('/farmacia/detalle-entrega/sin-registro', verificarToken, verificarRol(['Farmacia', 'Medicina General']), DetalleEntregasController.medicinasinrg);
ApiRouter.put('/farmacia/detalle-entrega/inventario/:id', verificarToken, verificarRol(['Farmacia']), DetalleEntregasController.actualizaridinventario);

// Inventario (existía en el PHP original, faltaba migrar por completo)
ApiRouter.get('/inventario', verificarToken, InventarioController.index);
ApiRouter.post('/inventario', verificarToken, verificarRol(['Farmacia']), InventarioController.store);
ApiRouter.get('/inventario/:id', verificarToken, InventarioController.show);
ApiRouter.delete('/inventario/:id', verificarToken, verificarRol(['Farmacia']), InventarioController.destroy);
ApiRouter.put('/actualizarexistencia/:id', verificarToken, InventarioController.updateExistencia);
ApiRouter.put('/subtract-inventory/:id', verificarToken, InventarioController.subtractInventory);
ApiRouter.put('/medicamentodesechado/:id', verificarToken, InventarioController.medicamentodesechado);
ApiRouter.get('/farmacia/detalle-entrega', verificarToken, DetalleEntregasController.index);
ApiRouter.post('/farmacia/detalle-entrega', verificarToken, verificarRol(['Farmacia', 'Medicina General']), DetalleEntregasController.store);

// MÓDULO: GESTIÓN DE CITAS MÉDICAS
ApiRouter.get('/citas/validar/:especialidad/:fechaActual', verificarToken, verificarRol(['Secretaría', 'Medicina General', 'Rehabilitación Física']), CitaController.validarMGandRF);
ApiRouter.get('/citas/validar-hora/:fecha/:tipo', verificarToken, verificarRol(['Secretaría', 'Medicina General', 'Rehabilitación Física']), CitaController.validarHora);
ApiRouter.get('/citas/validar-hora-user/:fecha/:tipo', verificarToken, verificarRol(['Secretaría', 'Medicina General', 'Rehabilitación Física']), CitaController.validarHoraUser);
ApiRouter.get('/citas/validar-existente/:cedula/:fechaActual', verificarToken, verificarRol(['Secretaría', 'Medicina General', 'Rehabilitación Física']), CitaController.ValidarCita);
ApiRouter.get('/citas/buscar-paciente/:ced', verificarToken, verificarRol(['Secretaría', 'Medicina General', 'Rehabilitación Física']), CitaController.buscedu);
ApiRouter.put('/citas/actualizar-estado/:cedula', verificarToken, verificarRol(['Secretaría', 'Medicina General', 'Rehabilitación Física']), CitaController.ActualizarEstado);
ApiRouter.get('/citas', verificarToken, verificarRol(['Secretaría', 'Medicina General', 'Rehabilitación Física']), CitaController.index);
ApiRouter.post('/citas', verificarToken, verificarRol(['Secretaría', 'Medicina General', 'Rehabilitación Física']), CitaController.store);
ApiRouter.get('/citas/:id', verificarToken, verificarRol(['Secretaría', 'Medicina General', 'Rehabilitación Física']), CitaController.show);
ApiRouter.put('/citas/:id', verificarToken, verificarRol(['Secretaría', 'Medicina General', 'Rehabilitación Física']), CitaController.update);
ApiRouter.delete('/citas/:id', verificarToken, verificarRol(['Secretaría', 'Medicina General', 'Rehabilitación Física']), CitaController.destroy);


// MÓDULO: CUENTAS, MÉDICOS Y ACCESOS (PRODUCCIÓN TOTAL - PROTECCIÓN ECC)
ApiRouter.post('/cuentas/login', CuentaController.iniciarSesion);
ApiRouter.get('/cuentas/validar/:correo', verificarToken, CuentaController.validarUsuario);
ApiRouter.get('/cuentas/rol/:id_rol', verificarToken, CuentaController.obtenerCuentasPorRol);
ApiRouter.get('/cuentas', verificarToken, CuentaController.index);
ApiRouter.get('/cuentas/:id', verificarToken, CuentaController.showId);
ApiRouter.post('/cuentas', verificarToken, verificarAdmin, CuentaController.store);
ApiRouter.post('/cuentas/:id/regenerar-llave', verificarToken, verificarAdmin, CuentaController.regenerarLlave);
ApiRouter.put('/cuentas/mi-password', verificarToken, CuentaController.cambiarMiPassword);
ApiRouter.put('/cuentas/:id', verificarToken, verificarAdmin, CuentaController.update);
ApiRouter.put('/cuentas/:id/resetear-password', verificarToken, verificarAdmin, CuentaController.resetearPassword);
ApiRouter.delete('/cuentas/:id', verificarToken, verificarAdmin, CuentaController.delete);


ApiRouter.get('/roles', verificarToken, RoleController.listarRoles);
ApiRouter.post('/roles', verificarToken, verificarAdmin, RoleController.crearRol);
ApiRouter.get('/roles/:id', verificarToken, RoleController.obtenerRolPorId);
ApiRouter.put('/roles/:id', verificarToken, verificarAdmin, RoleController.actualizarRol);
ApiRouter.delete('/roles/:id', verificarToken, verificarAdmin, RoleController.eliminarRol);
ApiRouter.get('/roles/especialidad/:especialidad', verificarToken, RoleController.idRol);
ApiRouter.get('/roles/medicos/atencion', verificarToken, RoleController.rolesMedicos);


// MÓDULO CLINICO: EXPEDIENTE, DIAGNÓSTICOS Y EXPLORACIÓN
ApiRouter.get('/clinico/diagnostico', verificarToken, DiagnosticoController.obtenerTodos);
ApiRouter.post('/clinico/diagnostico', verificarToken, DiagnosticoController.crear);
ApiRouter.get('/clinico/diagnostico/:id_diagnostico', verificarToken, DiagnosticoController.obtenerPorId);
ApiRouter.put('/clinico/diagnostico/:id_diagnostico', verificarToken, DiagnosticoController.actualizar);
ApiRouter.delete('/clinico/diagnostico/:id_diagnostico', verificarToken, DiagnosticoController.eliminar);

ApiRouter.get('/clinico/egreso', verificarToken, EgresoController.obtenerTodos);
ApiRouter.post('/clinico/egreso', verificarToken, verificarRol(['Secretaría']), EgresoController.crear);
ApiRouter.get('/clinico/egreso/:id', verificarToken, EgresoController.obtenerPorId);
ApiRouter.put('/clinico/egreso/:id', verificarToken, verificarRol(['Secretaría']), EgresoController.actualizar);
ApiRouter.delete('/clinico/egreso/:id', verificarToken, verificarRol(['Secretaría']), EgresoController.eliminar);

ApiRouter.get('/clinico/enfermedad', verificarToken, EnfermedadController.obtenerTodos);
ApiRouter.post('/clinico/enfermedad', verificarToken, EnfermedadController.crear);
ApiRouter.get('/clinico/enfermedad/:id_enfermedad', verificarToken, EnfermedadController.obtenerPorId);
ApiRouter.put('/clinico/enfermedad/:id_enfermedad', verificarToken, EnfermedadController.actualizar);
ApiRouter.delete('/clinico/enfermedad/:id_enfermedad', verificarToken, EnfermedadController.eliminar);

ApiRouter.get('/clinico/examenes-complementarios', verificarToken, ExamenesComplementarioController.index);
ApiRouter.get('/clinico/examenes-complementarios/paciente/:id_paciente', verificarToken, ExamenesComplementarioController.porPaciente);
ApiRouter.post('/clinico/examenes-complementarios', verificarToken, verificarRol(['Secretaría', 'Medicina General', 'Rehabilitación Física']), ExamenesComplementarioController.store);
ApiRouter.get('/clinico/examenes-complementarios/:id', verificarToken, ExamenesComplementarioController.show);
ApiRouter.put('/clinico/examenes-complementarios/:id', verificarToken, verificarRol(['Secretaría', 'Medicina General', 'Rehabilitación Física']), ExamenesComplementarioController.update);
ApiRouter.delete('/clinico/examenes-complementarios/:id', verificarToken, ExamenesComplementarioController.destroy);

ApiRouter.get('/clinico/examen-fisico', verificarToken, ExamenFisicoController.index);
ApiRouter.post('/clinico/examen-fisico', verificarToken, verificarRol(['Secretaría']), ExamenFisicoController.store);
ApiRouter.get('/clinico/examen-fisico/:id', verificarToken, ExamenFisicoController.show);
ApiRouter.put('/clinico/examen-fisico/:id', verificarToken, verificarRol(['Secretaría']), ExamenFisicoController.update);
ApiRouter.delete('/clinico/examen-fisico/:id', verificarToken, ExamenFisicoController.destroy);

ApiRouter.get('/clinico/examen-organo-sistema', verificarToken, ExamenOrganoSistemaController.index);
ApiRouter.post('/clinico/examen-organo-sistema', verificarToken, verificarRol(['Secretaría']), ExamenOrganoSistemaController.store);
ApiRouter.get('/clinico/examen-organo-sistema/:id', verificarToken, ExamenOrganoSistemaController.show);
ApiRouter.put('/clinico/examen-organo-sistema/:id', verificarToken, verificarRol(['Secretaría']), ExamenOrganoSistemaController.update);
ApiRouter.delete('/clinico/examen-organo-sistema/:id', verificarToken, ExamenOrganoSistemaController.destroy);


// CORE CLÍNICO: CAPA CRIPTOGRÁFICA 


// --- REHABILITACIÓN FÍSICA ---
ApiRouter.post('/mg/historias', verificarToken, verificarRol(['Medicina General']), HistoriaClinicaMGController.crearHistoria);
ApiRouter.get('/mg/historias/verificar-todas', verificarToken, verificarAdmin, HistoriaClinicaMGController.verificarTodas);
ApiRouter.get('/mg/historias/verificar/:id', verificarToken, verificarRol(['Medicina General']), HistoriaClinicaMGController.verificarIntegridad);
ApiRouter.get('/mg/historias/:id', verificarToken, verificarRol(['Medicina General']), HistoriaClinicaMGController.obtenerHistoria);
ApiRouter.get('/mg/pacientes/consultas/:id', verificarToken, verificarRol(['Medicina General', 'Administrador']), HistoriaClinicaMGController.ConsultasPacientesMG);
ApiRouter.get('/mg/historias/rango/:fechaInicial/:fechaFinal', verificarToken, verificarRol(['Medicina General']), HistoriaClinicaMGController.FiltradoFechaMG);
ApiRouter.get('/mg/estadisticas/:fechaInicial/:fechaFinal/:especialidad', verificarToken, verificarRol(['Medicina General']), HistoriaClinicaMGController.DatosEstadisticosMG);
ApiRouter.post('/rf/historias', verificarToken, verificarRol(['Rehabilitación Física']), HistoriaClinicaRFController.store);
ApiRouter.get('/rf/historias/verificar-todas', verificarToken, verificarAdmin, HistoriaClinicaRFController.verificarTodas);
ApiRouter.get('/rf/historias/verificar/:id', verificarToken, verificarRol(['Rehabilitación Física']), HistoriaClinicaRFController.verificarIntegridad);
ApiRouter.get('/rf/historias/:id', verificarToken, verificarRol(['Rehabilitación Física']), HistoriaClinicaRFController.show);
ApiRouter.get('/rf/pacientes/consultas/:id', verificarToken, verificarRol(['Rehabilitación Física', 'Administrador']), HistoriaClinicaRFController.ConsultasPacientesRF);
ApiRouter.get('/rf/historias/rango/:fechaInicial/:fechaFinal', verificarToken, verificarRol(['Rehabilitación Física']), HistoriaClinicaRFController.FiltradoFecha);
ApiRouter.get('/rf/estadisticas/:fechaInicial/:fechaFinal/:especialidad', verificarToken, verificarRol(['Rehabilitación Física']), HistoriaClinicaRFController.DatosEstadisticos);


// MÓDULO: ADMINISTRACIÓN DE PACIENTES, PARÁMETROS Y TURNOS
// La lista y el detalle completo de pacientes quedan fuera del alcance del
// Administrador — su función es que el sistema funcione, no acceder a datos
// clínicos de pacientes. La búsqueda por cédula (más abajo) queda abierta
// porque Historial Clínico Completo (función propia de Admin) la usa como
// utilidad interna para ubicar un paciente, sin exponer su expediente completo.
ApiRouter.get('/pacientes', verificarToken, verificarRol(['Secretaría', 'Medicina General', 'Rehabilitación Física']), PacienteController.listarPacientes);
ApiRouter.post('/pacientes', verificarToken, verificarRol(['Secretaría']), PacienteController.crearPaciente);
ApiRouter.get('/pacientes/:id', verificarToken, verificarRol(['Secretaría', 'Medicina General', 'Rehabilitación Física']), PacienteController.obtenerPacientePorId);
ApiRouter.put('/pacientes/:id', verificarToken, verificarRol(['Secretaría']), PacienteController.actualizarPaciente);
ApiRouter.delete('/pacientes/:id', verificarToken, verificarRol(['Secretaría']), PacienteController.eliminarPaciente);
ApiRouter.get('/pacientes/cedula/:cedula', verificarToken, PacienteController.buscarPorCedula);
ApiRouter.get('/pacientes/filtro/fecha/:fecha', verificarToken, PacienteController.filtro);
ApiRouter.get('/pacientes/atender/:cedula', verificarToken, PacienteController.Atender);

ApiRouter.get('/parametros', verificarToken, ParametrosController.listarParametros);
ApiRouter.post('/parametros', verificarToken, ParametrosController.crearParametro);
ApiRouter.get('/parametros/:id', verificarToken, ParametrosController.obtenerParametroPorId);
ApiRouter.put('/parametros/:id', verificarToken, ParametrosController.actualizarParametro);
ApiRouter.delete('/parametros/:id', verificarToken, ParametrosController.eliminarParametro);
ApiRouter.put('/parametros/estado/:id', verificarToken, ParametrosController.actualizarEstadoParametro);
// Parámetros heredados (Legacy PHP)
ApiRouter.get('/parametros/data/mgv1', verificarToken, ParametrosController.getMGV1Data);
ApiRouter.get('/parametros/data/mgv2', verificarToken, ParametrosController.getMGV2Data);
ApiRouter.get('/parametros/data/rfv1', verificarToken, ParametrosController.getRFV1Data);
ApiRouter.get('/parametros/data/rfv2', verificarToken, ParametrosController.getRFV2Data);
ApiRouter.get('/parametros/data/nombredoc', verificarToken, ParametrosController.getnombredoc);
ApiRouter.get('/parametros/data/stockmin', verificarToken, ParametrosController.getstockmin);
ApiRouter.get('/parametros/data/diasexp', verificarToken, ParametrosController.getsdiasexp);

ApiRouter.get('/recaudaciones', verificarToken, RecaudacionController.listarRecaudaciones);
ApiRouter.post('/recaudaciones', verificarToken, verificarRol(['Secretaría']), RecaudacionController.crearRecaudacion);
ApiRouter.get('/recaudaciones/:id_recaudacion', verificarToken, RecaudacionController.obtenerRecaudacionPorId);
ApiRouter.delete('/recaudaciones/:id_recaudacion', verificarToken, verificarRol(['Secretaría']), RecaudacionController.eliminarRecaudacion);

ApiRouter.get('/tratamientos', verificarToken, TratamientoController.listarTratamientos);
ApiRouter.post('/tratamientos', verificarToken, TratamientoController.crearTratamiento);
ApiRouter.get('/tratamientos/:id', verificarToken, TratamientoController.obtenerTratamientoPorId);
ApiRouter.put('/tratamientos/:id', verificarToken, TratamientoController.actualizarTratamiento);
ApiRouter.delete('/tratamientos/:id', verificarToken, TratamientoController.eliminarTratamiento);

ApiRouter.get('/turnos', verificarToken, TurnoController.listarTurnos);
ApiRouter.post('/turnos', verificarToken, TurnoController.crearTurno);
ApiRouter.get('/turnos/:id', verificarToken, TurnoController.obtenerTurnoPorId);
ApiRouter.put('/turnos/:id', verificarToken, TurnoController.actualizarTurno);
ApiRouter.delete('/turnos/:id', verificarToken, TurnoController.eliminarTurno);

// MÓDULO: ANALÍTICA Y REPORTES ESTADÍSTICOS (validación previa, JSON)
ApiRouter.get('/reportes/pacientes/anual/:year', verificarToken, PDFController.validarReportePacientesAnual);
ApiRouter.get('/reportes/pacientes/mensual/:mes/:year', verificarToken, PDFController.validarReportePacientesMensual);
ApiRouter.get('/reportes/morbilidad/:mes/:year', verificarToken, PDFController.validarMorbilidadMedicinaGeneral);
ApiRouter.get('/reportes/morbilidad/rf/:mes/:year', verificarToken, PDFController.validarMorbilidadTerapia);
ApiRouter.get('/reportes/diario/mg/:fecha', verificarToken, PDFController.validarRegistroDiarioMedicina);
ApiRouter.get('/reportes/diario/rf/:fecha', verificarToken, PDFController.validarRegistroDiarioFisica);
ApiRouter.get('/reportes/consolidado/mg/:mes/:year', verificarToken, PDFController.validarConsolidadoMensualMedicinaGeneral);
ApiRouter.get('/reportes/consolidado/rf/:mes/:year', verificarToken, PDFController.validarConsolidadoMensualTerapia);
ApiRouter.get('/reportes/lugar/mg/:lugar/:desde/:hasta', verificarToken, PDFController.validarLugarMG);
ApiRouter.get('/reportes/lugar/rf/:lugar/:desde/:hasta', verificarToken, PDFController.validarLugarRF);
ApiRouter.get('/reportes/recaudacion/diario/mg/:fecha/:id', verificarToken, PDFController.validarRecaudacionDiarioMedicinaGeneral);
ApiRouter.get('/reportes/recaudacion/diario/rf/:fecha/:id', verificarToken, PDFController.validarRecaudacionDiarioTerapia);
ApiRouter.get('/reportes/recaudacion/mensual/:mes/:year', verificarToken, PDFController.validarRecaudacionMensual);
ApiRouter.get('/reportes/recetapdf/:id_entrega', verificarToken, PDFController.validarReceta);

// MÓDULO: GENERACIÓN REAL DE PDF (streams binarios, abiertos con window.open desde Angular)
ApiRouter.get('/ReportePacientesAnual/:year', verificarToken, PDFController.reportePacientesAnual);
ApiRouter.get('/ReportePacientesMensual/:mes/:year', verificarToken, PDFController.reportePacientesMensual);
ApiRouter.get('/MorbilidadMedicinaGeneral/:mes/:year', verificarToken, PDFController.morbilidadMedicinaGeneral);
ApiRouter.get('/MorbilidadTerapia/:mes/:year', verificarToken, PDFController.morbilidadTerapia);
ApiRouter.get('/RegistroDiarioMedicina/:fecha', verificarToken, PDFController.registroDiarioMedicina);
ApiRouter.get('/RegistroDiarioFisica/:fecha', verificarToken, PDFController.registroDiarioFisica);
ApiRouter.get('/ConsolidadoMensualMedicinaGeneral/:mes/:year', verificarToken, PDFController.consolidadoMensualMedicinaGeneral);
ApiRouter.get('/ConsolidadoMensualTerapia/:mes/:year', verificarToken, PDFController.consolidadoMensualTerapia);
ApiRouter.get('/LugarAtencionMedicinaGeneral/:lugar/:desde/:hasta', verificarToken, PDFController.lugarAtencionMedicinaGeneral);
ApiRouter.get('/LugarAtencionRehabilitacionFisica/:lugar/:desde/:hasta', verificarToken, PDFController.lugarAtencionRehabilitacionFisica);
ApiRouter.get('/RecaudacionDiarioMedicinaGeneral/:fecha/:id', verificarToken, PDFController.recaudacionDiarioMedicinaGeneral);
ApiRouter.get('/RecaudacionDiarioTerapia/:fecha/:id', verificarToken, PDFController.recaudacionDiarioTerapia);
ApiRouter.get('/RecaudacionMensual/:mes/:year', verificarToken, PDFController.recaudacionMensual);
ApiRouter.get('/Receta/:color/:nombre/:peso/:talla/:ta/:edad/:fecha/:rp/:pres', verificarToken, PDFController.receta);
ApiRouter.get('/recetapdf/:id_entrega', verificarToken, PDFController.recetapdf);
ApiRouter.get('/recetafinal/:id_entrega', verificarToken, PDFController.recetafinal);
ApiRouter.get('/reportes/aviso-privacidad/:id_paciente', verificarToken, PDFController.avisoPrivacidad);

// ===== LOPDP: Incidentes de seguridad (solo Administrador) =====
ApiRouter.get('/incidentes-seguridad', verificarToken, verificarAdmin, IncidenteSeguridadController.listar);
ApiRouter.post('/incidentes-seguridad', verificarToken, verificarAdmin, IncidenteSeguridadController.crear);
ApiRouter.put('/incidentes-seguridad/:id', verificarToken, verificarAdmin, IncidenteSeguridadController.actualizar);

// ===== LOPDP: Solicitudes de derechos ARCO+ (Secretaría registra, Administrador también puede ver/resolver) =====
ApiRouter.get('/solicitudes-arco', verificarToken, verificarRol(['Secretaría', 'Administrador']), SolicitudArcoController.listar);
ApiRouter.post('/solicitudes-arco', verificarToken, verificarRol(['Secretaría']), SolicitudArcoController.crear);
ApiRouter.put('/solicitudes-arco/:id', verificarToken, verificarRol(['Secretaría', 'Administrador']), SolicitudArcoController.resolver);
// Pendientes (ver checklist): MorbilidadTerapia, RegistroDiarioMedicina, RegistroDiarioFisica,
// ConsolidadoMensualMedicinaGeneral, ConsolidadoMensualTerapia, LugarAtencionMedicinaGeneral,
// LugarAtencionRehabilitacionFisica, RecaudacionDiarioMedicinaGeneral, RecaudacionDiarioTerapia,
// RecaudacionMensual, Receta, recetapdf, recetafinal