import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const InventarioModel = sequelize.define('Inventario', {
    id_inventario: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    id_medicamento: { type: DataTypes.BIGINT, allowNull: false },
    existencias: { type: DataTypes.INTEGER },
    fechacre: { type: DataTypes.DATEONLY },
    fechaexp: { type: DataTypes.DATEONLY },
    fechareg: { type: DataTypes.DATEONLY },
    valoruni: { type: DataTypes.DOUBLE },
    codigodebarra: { type: DataTypes.STRING(191) },
    estado: { type: DataTypes.BOOLEAN }
}, {
    schema: 'public',
    tableName: 'inventarios',
    timestamps: false
});