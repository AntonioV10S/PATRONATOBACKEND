import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const EntregaModel = sequelize.define('Entrega', {
    id_entrega: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    id_paciente: { type: DataTypes.BIGINT, allowNull: false },
    Fechaentrega: { type: DataTypes.DATEONLY, field: 'Fechaentrega' },
    peso: { type: DataTypes.STRING(191) },
    talla: { type: DataTypes.STRING(191) },
    ta: { type: DataTypes.STRING(191) },
    subtotal: { type: DataTypes.DOUBLE },
    descuento: { type: DataTypes.INTEGER },
    totalapagar: { type: DataTypes.DOUBLE },
    entregado: { type: DataTypes.BOOLEAN }
}, {
    schema: 'public',
    tableName: 'entregas',
    timestamps: false
});