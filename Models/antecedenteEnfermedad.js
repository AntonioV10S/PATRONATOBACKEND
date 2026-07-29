import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';

export const AntecedenteEnfermedadModel = sequelize.define('AntecedenteEnfermedad', {
    id_a_enfermedad: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id_a_enfermedad'
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'descripcion'
    }
}, {
    tableName: 'antecedentes_enfermedades',
    timestamps: false
});