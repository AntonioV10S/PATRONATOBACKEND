import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const MedicamentoModel = sequelize.define('Medicamento', {
    id_medicamento: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    id_categoriamedicamento: { type: DataTypes.BIGINT, allowNull: false },
    id_laboratorio: { type: DataTypes.BIGINT, allowNull: false },
    nombre: { type: DataTypes.STRING(191) },
    descripcion: { type: DataTypes.STRING(300) },
    estado: { type: DataTypes.BOOLEAN }
}, {
    schema: 'public',
    tableName: 'medicamentos',
    timestamps: false
});