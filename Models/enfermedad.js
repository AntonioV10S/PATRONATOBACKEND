import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const EnfermedadModel = sequelize.define('Enfermedad', {
    id_enfermedad: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    enfermedad: { type: DataTypes.STRING(191), allowNull: false },
    tipo_enfermedad: { type: DataTypes.STRING },
    codigo_cie: { type: DataTypes.STRING(10) }
}, {
    schema: 'public',
    tableName: 'enfermedades',
    timestamps: false
});