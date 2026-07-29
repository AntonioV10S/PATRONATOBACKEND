import { DataTypes } from "sequelize";
import { sequelize } from "../db/conexion.js";

export const CategoriaMedicamentoModel = sequelize.define(
  "CategoriaMedicamento",
  {
    id_categoriamedicamento: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    tipo: { type: DataTypes.STRING(191) },
    estado: { type: DataTypes.BOOLEAN },
  },
  {
    schema: "public",
    tableName: "categoriamedicamentos",
    timestamps: false,
  },
);
