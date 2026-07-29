import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const TratamientoModel = sequelize.define('Tratamiento', {
    id_tratamiento: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    estimulacion_temprana: { type: DataTypes.STRING(191) },
    magnetoterapia: { type: DataTypes.STRING(191) },
    electroestimulacion: { type: DataTypes.STRING(191) },
    ultrasonido: { type: DataTypes.STRING(191) },
    C_Q_C_O_H: { type: DataTypes.STRING(191), field: 'C_Q_C_O_H' },
    masaje: { type: DataTypes.STRING(191) },
    ejercicios_pasivos_resistidos: { type: DataTypes.STRING(191) },
    laser: { type: DataTypes.STRING(191) },
    otros: { type: DataTypes.STRING(191) }
}, {
    schema: 'public',
    tableName: 'tratamientos',
    timestamps: false
});