import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const DiagnosticoModel = sequelize.define('Diagnostico', {
    id_diagnostico: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    diagnostico: { type: DataTypes.STRING(191), allowNull: false },
    codigo_cie: { type: DataTypes.STRING(10) }
}, {
    schema: 'public',
    tableName: 'diagnosticos',
    timestamps: false
});