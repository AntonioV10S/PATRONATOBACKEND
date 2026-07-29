import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const ExamenFisicoModel = sequelize.define('ExamenFisico', {
    id_e_fisico: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    cabeza: { type: DataTypes.STRING(191) },
    cuello: { type: DataTypes.STRING(191) },
    torax: { type: DataTypes.STRING(191) },
    abdomen: { type: DataTypes.STRING(191) },
    miembros_superiores: { type: DataTypes.STRING(191) },
    miembros_inferiores: { type: DataTypes.STRING(191) },
    region_genital: { type: DataTypes.STRING(191) },
    region_anal: { type: DataTypes.STRING(191) }
}, {
    schema: 'public',
    tableName: 'examen_fisicos',
    timestamps: false
});