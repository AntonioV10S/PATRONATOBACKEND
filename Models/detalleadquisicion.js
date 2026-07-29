import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const DetalleAdquisicionModel = sequelize.define('DetalleAdquisicion', {
    id_detalle_adquisicion: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    id_adquisicion: { type: DataTypes.BIGINT, allowNull: false },
    id_medicamento: { type: DataTypes.BIGINT, allowNull: false },
    cantidadmedicamentos: { type: DataTypes.INTEGER },
    codigodebarra: { type: DataTypes.STRING(191) },
    valoruni: { type: DataTypes.DOUBLE },
    fechacre: { type: DataTypes.DATEONLY },
    fechaexp: { type: DataTypes.DATEONLY },
    fechareg: { type: DataTypes.DATEONLY },
    estado: { type: DataTypes.BOOLEAN }
}, {
    schema: 'public',
    tableName: 'detalle_adquisicions',
    timestamps: false
});