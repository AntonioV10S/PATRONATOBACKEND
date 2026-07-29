import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const ExamenComplementarioModel = sequelize.define('ExamenComplementario', {
    id_e_complementario: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    laboratorio: { type: DataTypes.TEXT },
    electrocardiograma: { type: DataTypes.TEXT },
    radiografia_torax: { type: DataTypes.TEXT },
    otros: { type: DataTypes.TEXT }
}, {
    schema: 'public',
    tableName: 'examenes_complementarios',
    timestamps: false
});