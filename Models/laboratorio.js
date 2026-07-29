import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const LaboratorioModel = sequelize.define('Laboratorio', {
    id_laboratorio: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(191) },
    descripcion: { type: DataTypes.STRING(191) },
    estado: { type: DataTypes.BOOLEAN }
}, {
    schema: 'public',
    tableName: 'laboratorios',
    timestamps: false
});