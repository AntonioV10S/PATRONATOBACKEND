import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const HistoriaClinicaMGModel = sequelize.define('HistoriaClinicaMG', {
  id_historia_mg: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  id_paciente: { type: DataTypes.BIGINT, allowNull: false },
  id_enfermedad: { type: DataTypes.BIGINT, allowNull: false },
  id_cuenta_auditoria: { type: DataTypes.BIGINT },
  fecha: { type: DataTypes.DATEONLY, allowNull: false },
  tipo_atencion: { type: DataTypes.STRING(800) },
  condicion_diagnostico: { type: DataTypes.STRING(800) },
  lugar_atencion: { type: DataTypes.STRING(191) },
  certificado: { type: DataTypes.BOOLEAN },
  edad: { type: DataTypes.STRING(191) },
  firma_ecdsa: { type: DataTypes.TEXT },
  llave_publica_pem: { type: DataTypes.TEXT },
  hash_integridad: { type: DataTypes.TEXT }
}, {
  schema: 'public',
  tableName: 'historias_clinicas_mg',
  timestamps: false
});