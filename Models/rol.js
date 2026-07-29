import { DataTypes } from "sequelize";
import { sequelize } from "../db/conexion.js";

export const RolModel = sequelize.define(
  "Rol",
  {
    id_rol: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    rol: { type: DataTypes.STRING(191), allowNull: false },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    atencion: { type: DataTypes.BOOLEAN, allowNull: false },
    atiende_medico: { type: DataTypes.BOOLEAN },
  },
  {
    schema: "public",
    tableName: "roles",
    timestamps: false,
  },
);
