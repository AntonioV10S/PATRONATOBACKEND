import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const FamiliarModel = sequelize.define('Familiar', {
    id_familiar: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    nombres: { type: DataTypes.STRING(191) },
    union: { type: DataTypes.STRING(191), field: 'union' },
    vida: { type: DataTypes.BOOLEAN, allowNull: false },
    causas: { type: DataTypes.STRING(191), field: 'causes' }
}, {
    schema: 'public',
    tableName: 'familiares',
    timestamps: false
});