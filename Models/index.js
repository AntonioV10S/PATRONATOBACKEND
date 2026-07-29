import { RolModel } from './rol.js';
import { MedicoModel } from './medico.js';
import { TurnoModel } from './turno.js';
import { CitaModel } from './cita.js';
import { PacienteModel } from './paciente.js';
import { AntecedenteGinecoModel } from './antecedentegineco.js';
import { AntecedentePatologicoPersonalModel } from './antecedentepatologicopersonal.js';
import { FamiliarModel } from './familiar.js';
import { HabitoModel } from './habito.js';
import { ExamenFisicoModel } from './examenfisico.js';
import { ExamenOrganoSistemaModel } from './examenorganosistema.js';
import { ExamenComplementarioModel } from './examencomplementario.js';
import { AntecedentePatologicoFamiliarModel } from './antecedentepatolicofamiliar.js';
import { DiagnosticoModel } from './diagnostico.js';
import { TratamientoModel } from './tratamiento.js';
import { HistoriaClinicaMGModel } from './historiaclinicamg.js';
import { ContenidoCifradoMGModel } from './contenidocifradomg.js';
import { HistoriaClinicaRFModel } from './historiaclicarf.js';
import { ContenidoCifradoRFModel } from './contenidocifradorf.js';
import { CategoriaMedicamentoModel } from './categoriamedicamento.js'; 
import { LaboratorioModel } from './laboratorio.js';
import { MedicamentoModel } from './medicamento.js';
import { InventarioModel } from './inventario.js';
import { AdquisicionModel } from './adquisicion.js';
import { DetalleAdquisicionModel } from './detalleadquisicion.js';
import { EntregaModel } from './entrega.js';
import { DetalleEntregaModel } from './detalleentrega.js';
import { RecaudacionModel } from './recaudacion.js';
import { EgresoModel } from './egreso.js';
import { ParametroModel } from './parametro.js';
import { AuditoriaCryptoModel } from './auditoriacrypto.js';
import { LlaveEccModel } from './llaveecc.js';
import { AntecedenteEnfermedadModel } from './antecedenteEnfermedad.js';
import { EnfermedadModel } from './enfermedad.js';
import { AsignacionModel } from './asignaciones.js';
import { IncidenteSeguridadModel } from './incidenteseguridad.js';
import { SolicitudArcoModel } from './solicitudarco.js';

// CARDINALIDADES CRIPTOGRÁFICAS 1:1
HistoriaClinicaMGModel.hasOne(ContenidoCifradoMGModel, { foreignKey: 'id_historia_mg', as: 'contenidoCifrado' });
ContenidoCifradoMGModel.belongsTo(HistoriaClinicaMGModel, { foreignKey: 'id_historia_mg' });

HistoriaClinicaRFModel.hasOne(ContenidoCifradoRFModel, { foreignKey: 'id_rf', as: 'contenidoCifradoRF' });
ContenidoCifradoRFModel.belongsTo(HistoriaClinicaRFModel, { foreignKey: 'id_rf' });

// RELACIONES DEL SISTEMA (Rol / Cuenta / Turno / Cita)
RolModel.hasMany(MedicoModel, { foreignKey: 'id_rol', as: 'cuentas' });
MedicoModel.belongsTo(RolModel, { foreignKey: 'id_rol', as: 'rol' });

RolModel.hasMany(TurnoModel, { foreignKey: 'id_rol', as: 'turnos' });
TurnoModel.belongsTo(RolModel, { foreignKey: 'id_rol', as: 'rol' });

TurnoModel.hasMany(CitaModel, { foreignKey: 'id_turno', as: 'citas' });
CitaModel.belongsTo(TurnoModel, { foreignKey: 'id_turno', as: 'turno' });

// PACIENTE <-> bloques clínicos 1:1 (cada paciente referencia UN registro de cada bloque)
PacienteModel.belongsTo(AntecedentePatologicoPersonalModel, { foreignKey: 'id_patologico', as: 'antecedentes_patologicos_personales' });
AntecedentePatologicoPersonalModel.hasMany(PacienteModel, { foreignKey: 'id_patologico', as: 'pacientes' });

PacienteModel.belongsTo(ExamenFisicoModel, { foreignKey: 'id_e_fisico', as: 'examen_fisicos' });
PacienteModel.belongsTo(ExamenOrganoSistemaModel, { foreignKey: 'id_e_organo_sistema', as: 'examen_organo_sistemas' });
PacienteModel.belongsTo(ExamenComplementarioModel, { foreignKey: 'id_e_complementario', as: 'examene_complementarios' });
PacienteModel.belongsTo(HabitoModel, { foreignKey: 'id_habito', as: 'habitos' });

// Antecedente patológico personal <-> gineco-obstétrico
AntecedentePatologicoPersonalModel.belongsTo(AntecedenteGinecoModel, { foreignKey: 'id_gineco', as: 'antecedentes_ginecos_obstretico' });
AntecedenteGinecoModel.hasMany(AntecedentePatologicoPersonalModel, { foreignKey: 'id_gineco', as: 'antecedentes_patologicos_personales' });

// Paciente <-> Familiar (muchos a muchos vía antecedente_patologico_familiares)
PacienteModel.belongsToMany(FamiliarModel, {
    through: AntecedentePatologicoFamiliarModel,
    foreignKey: 'id_paciente',
    otherKey: 'id_familiar',
    as: 'familiares',
});
FamiliarModel.belongsToMany(PacienteModel, {
    through: AntecedentePatologicoFamiliarModel,
    foreignKey: 'id_familiar',
    otherKey: 'id_paciente',
    as: 'pacientes',
});

// Historias clínicas
PacienteModel.hasMany(HistoriaClinicaMGModel, { foreignKey: 'id_paciente', as: 'historias_clinicas_mg' });
HistoriaClinicaMGModel.belongsTo(PacienteModel, { foreignKey: 'id_paciente', as: 'paciente' });
HistoriaClinicaMGModel.belongsTo(EnfermedadModel, { foreignKey: 'id_enfermedad', as: 'enfermedad' });
HistoriaClinicaMGModel.belongsTo(MedicoModel, { foreignKey: 'id_cuenta_auditoria', as: 'medico' });

PacienteModel.hasMany(HistoriaClinicaRFModel, { foreignKey: 'id_paciente', as: 'historias_clinicas_rf' });
HistoriaClinicaRFModel.belongsTo(PacienteModel, { foreignKey: 'id_paciente', as: 'paciente' });
HistoriaClinicaRFModel.belongsTo(TratamientoModel, { foreignKey: 'id_tratamiento', as: 'tratamientos' });
HistoriaClinicaRFModel.belongsTo(DiagnosticoModel, { foreignKey: 'id_diagnostico', as: 'diagnostico' });
HistoriaClinicaRFModel.belongsTo(MedicoModel, { foreignKey: 'id_cuenta_auditoria', as: 'medico' });

// Farmacia / Inventario
MedicamentoModel.belongsTo(CategoriaMedicamentoModel, { foreignKey: 'id_categoriamedicamento', as: 'categoriaMedicamento' });
MedicamentoModel.belongsTo(LaboratorioModel, { foreignKey: 'id_laboratorio', as: 'laboratorio' });
InventarioModel.belongsTo(MedicamentoModel, { foreignKey: 'id_medicamento', as: 'medicamento' });
AdquisicionModel.hasMany(DetalleAdquisicionModel, { foreignKey: 'id_adquisicion', as: 'detalles' });
DetalleAdquisicionModel.belongsTo(AdquisicionModel, { foreignKey: 'id_adquisicion', as: 'adquisicion' });
DetalleAdquisicionModel.belongsTo(MedicamentoModel, { foreignKey: 'id_medicamento', as: 'medicamento' });
EntregaModel.hasMany(DetalleEntregaModel, { foreignKey: 'id_entrega', as: 'detalles' });
DetalleEntregaModel.belongsTo(EntregaModel, { foreignKey: 'id_entrega', as: 'entrega' });
DetalleEntregaModel.belongsTo(MedicamentoModel, { foreignKey: 'id_medicamento', as: 'medicamento' });
DetalleEntregaModel.belongsTo(InventarioModel, { foreignKey: 'id_inventario', as: 'inventario' });
PacienteModel.hasMany(EntregaModel, { foreignKey: 'id_paciente', as: 'entregas' });
EntregaModel.belongsTo(PacienteModel, { foreignKey: 'id_paciente', as: 'paciente' });

// Recaudación
PacienteModel.hasMany(RecaudacionModel, { foreignKey: 'id_paciente', as: 'recaudaciones' });
RecaudacionModel.belongsTo(PacienteModel, { foreignKey: 'id_paciente', as: 'paciente' });
RecaudacionModel.belongsTo(RolModel, { foreignKey: 'id_rol', as: 'rol' });
RecaudacionModel.belongsTo(MedicoModel, { foreignKey: 'id_cuenta_auditoria', as: 'cuentaAuditoria' });

// Auditoría / llaves ECC
MedicoModel.hasMany(AuditoriaCryptoModel, { foreignKey: 'id_cuenta', as: 'auditorias' });
AuditoriaCryptoModel.belongsTo(MedicoModel, { foreignKey: 'id_cuenta', as: 'cuenta' });
MedicoModel.hasMany(LlaveEccModel, { foreignKey: 'creado_por', as: 'llaves' });
LlaveEccModel.belongsTo(MedicoModel, { foreignKey: 'creado_por', as: 'creador' });

// Asignaciones (médico titular / reemplazo)
MedicoModel.hasMany(AsignacionModel, { foreignKey: 'id_medico_titular', as: 'asignacionesComoTitular' });
MedicoModel.hasMany(AsignacionModel, { foreignKey: 'id_medico_reemplazo', as: 'asignacionesComoReemplazo' });
AsignacionModel.belongsTo(MedicoModel, { foreignKey: 'id_medico_titular', as: 'titular' });
AsignacionModel.belongsTo(MedicoModel, { foreignKey: 'id_medico_reemplazo', as: 'reemplazo' });

// LOPDP: incidentes de seguridad y solicitudes ARCO+
MedicoModel.hasMany(IncidenteSeguridadModel, { foreignKey: 'registrado_por', as: 'incidentesRegistrados' });
IncidenteSeguridadModel.belongsTo(MedicoModel, { foreignKey: 'registrado_por', as: 'cuenta' });

PacienteModel.hasMany(SolicitudArcoModel, { foreignKey: 'id_paciente', as: 'solicitudesArco' });
SolicitudArcoModel.belongsTo(PacienteModel, { foreignKey: 'id_paciente', as: 'paciente' });
MedicoModel.hasMany(SolicitudArcoModel, { foreignKey: 'registrado_por', as: 'solicitudesArcoRegistradas' });
SolicitudArcoModel.belongsTo(MedicoModel, { foreignKey: 'registrado_por', as: 'cuenta' });

export {
    RolModel, MedicoModel, TurnoModel, CitaModel, PacienteModel, AntecedenteGinecoModel,
    AntecedentePatologicoPersonalModel, FamiliarModel, HabitoModel, ExamenFisicoModel,
    ExamenOrganoSistemaModel, ExamenComplementarioModel, AntecedentePatologicoFamiliarModel,
    DiagnosticoModel, TratamientoModel, HistoriaClinicaMGModel, ContenidoCifradoMGModel,
    HistoriaClinicaRFModel, ContenidoCifradoRFModel, CategoriaMedicamentoModel,
    LaboratorioModel, MedicamentoModel, InventarioModel, AdquisicionModel,
    DetalleAdquisicionModel, EntregaModel, DetalleEntregaModel, RecaudacionModel,
    EgresoModel, ParametroModel, AuditoriaCryptoModel, LlaveEccModel,
    AntecedenteEnfermedadModel, EnfermedadModel, AsignacionModel,
    IncidenteSeguridadModel, SolicitudArcoModel
};