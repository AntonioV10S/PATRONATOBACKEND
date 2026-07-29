import { DataTypes } from "sequelize";
import { sequelize } from "../db/conexion.js";

export const CitaModel = sequelize.define(
  "Cita",
  {
    id_cita: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    id_turno: { type: DataTypes.BIGINT, allowNull: false },
    nombres: { type: DataTypes.STRING(191), allowNull: false },
    cedula: { type: DataTypes.STRING(191), allowNull: false },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    estado: { type: DataTypes.STRING(191), allowNull: false },
    abono: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    schema: "public",
    tableName: "citas",
    timestamps: false,
  },
);
