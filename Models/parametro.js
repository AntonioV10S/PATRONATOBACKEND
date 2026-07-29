import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const ParametroModel = sequelize.define('Parametro', {
    id_parametros: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    nombres: { type: DataTypes.STRING(191) },
    cargo: { type: DataTypes.STRING(191) },
    profesion: { type: DataTypes.STRING(191) },
    valor: { type: DataTypes.STRING(191) },
    resolucion: { type: DataTypes.STRING(191) },
    pexistenciasmin: { type: DataTypes.INTEGER },
    pfechaexp: { type: DataTypes.INTEGER },
    estado: { type: DataTypes.BOOLEAN },
    llave_publica_pem: { type: DataTypes.TEXT },
    firma_configuracion: { type: DataTypes.TEXT },
    ultima_auditoria: { type: DataTypes.DATE }
}, {
    schema: 'public',
    tableName: 'parametros',
    timestamps: false
});