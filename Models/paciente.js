import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const PacienteModel = sequelize.define('Paciente', {
  id_paciente: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  id_patologico: { type: DataTypes.BIGINT },
  id_e_fisico: { type: DataTypes.BIGINT },
  id_e_organo_sistema: { type: DataTypes.BIGINT },
  id_e_complementario: { type: DataTypes.BIGINT },
  id_habito: { type: DataTypes.BIGINT },
  cedula_enc: { type: DataTypes.TEXT, allowNull: false },
  cedula_hash: { type: DataTypes.STRING(64) }, // índice ciego (HMAC), requiere ALTER TABLE
  nombres: { type: DataTypes.STRING(191), allowNull: false },
  apellidos: { type: DataTypes.STRING(191), allowNull: false },
  edad: { type: DataTypes.STRING(191), allowNull: false },
  sexo: { type: DataTypes.STRING(191), allowNull: false },
  gad: { type: DataTypes.BOOLEAN },
  ocupacion: { type: DataTypes.STRING(191) },
  residencia: { type: DataTypes.STRING(191) },
  procedencia: { type: DataTypes.STRING(191) },
  estado_civil: { type: DataTypes.STRING(191) },
  raza: { type: DataTypes.STRING(191) },
  religion: { type: DataTypes.STRING(191) },
  fecha_nacimiento: { type: DataTypes.DATEONLY, allowNull: false },
  nivel_instruccion: { type: DataTypes.STRING(191) },
  grupo_a_prioritaria: { type: DataTypes.STRING(50) },
  telefono_enc: { type: DataTypes.TEXT },
  email_enc: { type: DataTypes.TEXT },
  fecha_registro: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW }, // requiere ALTER TABLE
  // LOPDP: consentimiento informado para el tratamiento de datos personales y de salud
  consentimiento_datos: { type: DataTypes.BOOLEAN, defaultValue: false },
  fecha_consentimiento: { type: DataTypes.DATEONLY },
  consentimiento_registrado_por: { type: DataTypes.BIGINT } // id_cuenta de quien lo registró
}, {
  schema: 'public',
  tableName: 'pacientes',
  timestamps: false
});