import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const RecaudacionModel = sequelize.define('Recaudacion', {
    id_recaudacion: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    id_paciente: { type: DataTypes.BIGINT, allowNull: false },
    id_rol: { type: DataTypes.BIGINT, allowNull: false },
    id_cuenta_auditoria: { type: DataTypes.BIGINT },
    fecha: { type: DataTypes.DATEONLY },
    valor_enc: { type: DataTypes.TEXT, allowNull: false },
    exonera: { type: DataTypes.BOOLEAN, allowNull: false },
    observaciones: { type: DataTypes.STRING(191), allowNull: false },
    firma_ecdsa: { type: DataTypes.TEXT }
}, {
    schema: 'public',
    tableName: 'recaudaciones',
    timestamps: false
});