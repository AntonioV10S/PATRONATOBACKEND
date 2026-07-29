import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const EgresoModel = sequelize.define('Egreso', {
    id_egreso: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    descripcion: { type: DataTypes.STRING(191), allowNull: false },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    valor: { type: DataTypes.STRING(191), allowNull: false }
}, {
    schema: 'public',
    tableName: 'egresos',
    timestamps: false
});