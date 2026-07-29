import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const HistoriaClinicaRFModel = sequelize.define('HistoriaClinicaRF', {
    id_rf: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    id_paciente: { type: DataTypes.BIGINT, allowNull: false },
    id_tratamiento: { type: DataTypes.BIGINT, allowNull: false },
    id_diagnostico: { type: DataTypes.BIGINT, allowNull: false },
    id_cuenta_auditoria: { type: DataTypes.BIGINT },
    lugar_atencion: { type: DataTypes.STRING(191) },
    certificado: { type: DataTypes.BOOLEAN },
    fecha: { type: DataTypes.DATEONLY },
    edad: { type: DataTypes.STRING(191) },
    firma_ecdsa: { type: DataTypes.TEXT },
    llave_publica_pem: { type: DataTypes.TEXT },
    hash_integridad: { type: DataTypes.TEXT }
}, {
    schema: 'public',
    tableName: 'historias_clinicas_rf',
    timestamps: false
});