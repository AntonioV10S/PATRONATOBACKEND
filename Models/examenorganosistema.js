import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const ExamenOrganoSistemaModel = sequelize.define('ExamenOrganoSistema', {
    id_e_organo_sistema: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    sistema_digestivo: { type: DataTypes.STRING(191) },
    sistema_respiratorio: { type: DataTypes.STRING(191) },
    sistema_cardiaco: { type: DataTypes.STRING(191) },
    sistema_genitourinarion: { type: DataTypes.STRING(191) },
    sistema_osteomuscular: { type: DataTypes.STRING(191) },
    sistema_nervioso: { type: DataTypes.STRING(191) }
}, {
    schema: 'public',
    tableName: 'examen_organo_sistemas',
    timestamps: false
});