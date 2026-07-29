import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const HabitoModel = sequelize.define('Habito', {
    id_habito: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    alcohol: { type: DataTypes.STRING(191) },
    tabaco: { type: DataTypes.STRING(191) },
    drogas: { type: DataTypes.STRING(191) },
    alimentacion: { type: DataTypes.STRING(191) },
    diuresis: { type: DataTypes.STRING(191) },
    somnia: { type: DataTypes.STRING(191) }
}, {
    schema: 'public',
    tableName: 'habitos',
    timestamps: false
});