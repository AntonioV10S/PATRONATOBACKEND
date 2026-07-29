import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const LlaveEccModel = sequelize.define('LlaveEcc', {
    id_llave: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    creado_por: { type: DataTypes.BIGINT },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    llave_publica_pem: { type: DataTypes.TEXT, allowNull: false },
    algoritmo: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'prime256v1' },
    activa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    fecha_creacion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
    schema: 'public',
    tableName: 'llaves_ecc',
    timestamps: false
});