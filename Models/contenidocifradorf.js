import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const ContenidoCifradoRFModel = sequelize.define('ContenidoCifradoRF', {
    id_dato: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    id_rf: { type: DataTypes.BIGINT, allowNull: false, unique: true },
    payload_clinico_rf: { type: DataTypes.TEXT, allowNull: false }
}, {
    schema: 'public',
    tableName: 'contenido_cifrado_rf',
    timestamps: false
});