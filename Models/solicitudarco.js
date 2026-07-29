import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

// LOPDP Art. 14 y siguientes (derechos del titular): Acceso, Rectificación,
// Cancelación, Oposición y Portabilidad. Como los pacientes no usan el
// sistema directamente, esta tabla funciona como bitácora formal de las
// solicitudes que el paciente presenta en persona, y cómo se resolvieron.
export const SolicitudArcoModel = sequelize.define('SolicitudArco', {
  id_solicitud: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  id_paciente: { type: DataTypes.BIGINT, allowNull: false },
  tipo_solicitud: { type: DataTypes.STRING(50), allowNull: false }, // Acceso, Rectificación, Cancelación, Oposición, Portabilidad
  descripcion: { type: DataTypes.TEXT, allowNull: false }, // qué pide el paciente exactamente
  fecha_solicitud: { type: DataTypes.DATEONLY, allowNull: false },
  estado: { type: DataTypes.STRING(50), defaultValue: 'Pendiente' }, // Pendiente, En proceso, Resuelta, Rechazada
  resolucion: { type: DataTypes.TEXT },
  fecha_resolucion: { type: DataTypes.DATEONLY },
  registrado_por: { type: DataTypes.BIGINT, allowNull: false }, // id_cuenta
  fecha_registro: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  schema: 'public',
  tableName: 'solicitudes_arco',
  timestamps: false
});
