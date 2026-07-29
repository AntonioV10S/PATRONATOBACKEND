import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const TurnoModel = sequelize.define('Turno', {
    id_turno: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    id_rol: { type: DataTypes.BIGINT, allowNull: false },
    hora: { type: DataTypes.STRING(191) },
    amount: { type: DataTypes.INTEGER },
    estado: { type: DataTypes.BOOLEAN }
}, {
    schema: 'public',
    tableName: 'turnos',
    timestamps: false
});