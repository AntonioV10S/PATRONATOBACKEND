import { DataTypes } from "sequelize";
import { sequelize } from "../db/conexion.js";

export const MedicoModel = sequelize.define(
  "Medico",
  {
    id_cuenta: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    id_rol: { type: DataTypes.BIGINT, allowNull: false },
    nombres: { type: DataTypes.STRING(191), allowNull: false },
    correo: { type: DataTypes.STRING(191), allowNull: false },
    password_enc: { type: DataTypes.TEXT },
    imagen: { type: DataTypes.STRING(191), allowNull: false },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    token_sesion: { type: DataTypes.TEXT },
  },
  {
    schema: "public",
    tableName: "cuentas",
    timestamps: false,
  },
);
