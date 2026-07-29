import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const ContenidoCifradoMGModel = sequelize.define('ContenidoCifradoMG', {
    id_dato: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    id_historia_mg: { type: DataTypes.BIGINT, allowNull: false, unique: true },
    payload_clinico_mg: { type: DataTypes.TEXT, allowNull: false }
}, {
    schema: 'public',
    tableName: 'contenido_cifrado_mg',
    timestamps: false
});