import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const DetalleEntregaModel = sequelize.define('DetalleEntrega', {
    id_detalle_entrega: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    id_inventario: { type: DataTypes.BIGINT },
    id_entrega: { type: DataTypes.BIGINT, allowNull: false },
    id_medicamento: { type: DataTypes.BIGINT },
    cantidadmedicamentos: { type: DataTypes.INTEGER },
    indicaciones: { type: DataTypes.STRING(191) },
    medicinasinrg: { type: DataTypes.STRING(191) }
}, {
    schema: 'public',
    tableName: 'detalle_entregas',
    timestamps: false
});