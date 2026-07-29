import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

// LOPDP Art. 45-46 (notificación de vulneraciones de seguridad): registro
// formal de cualquier incidente que pueda comprometer la confidencialidad,
// integridad o disponibilidad de los datos personales tratados por el
// sistema (ej. pérdida de llaves criptográficas, acceso no autorizado,
// fallas que dejen datos inaccesibles o expuestos).
export const IncidenteSeguridadModel = sequelize.define('IncidenteSeguridad', {
  id_incidente: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  fecha_incidente: { type: DataTypes.DATEONLY, allowNull: false },
  tipo: { type: DataTypes.STRING(100), allowNull: false }, // ej: 'Pérdida de llave criptográfica', 'Acceso no autorizado', 'Falla de disponibilidad'
  descripcion: { type: DataTypes.TEXT, allowNull: false },
  datos_afectados: { type: DataTypes.TEXT }, // qué datos/registros se vieron afectados
  accion_tomada: { type: DataTypes.TEXT },
  notificado_autoridad: { type: DataTypes.BOOLEAN, defaultValue: false }, // Superintendencia de Protección de Datos Personales
  fecha_notificacion: { type: DataTypes.DATEONLY },
  notificado_titulares: { type: DataTypes.BOOLEAN, defaultValue: false }, // se avisó a los pacientes afectados, si aplica
  estado: { type: DataTypes.STRING(50), defaultValue: 'Abierto' }, // Abierto, En resolución, Cerrado
  registrado_por: { type: DataTypes.BIGINT, allowNull: false }, // id_cuenta
  fecha_registro: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  schema: 'public',
  tableName: 'incidentes_seguridad',
  timestamps: false
});
