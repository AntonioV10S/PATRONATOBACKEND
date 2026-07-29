import { DataTypes } from "sequelize";
import { sequelize } from "../db/conexion.js";

export const AntecedenteGinecoModel = sequelize.define(
  "AntecedenteGineco",
  {
    id_gineco: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    FUM: {
      type: DataTypes.STRING(191),
      field: "FUM",
    },
    FPP: { type: DataTypes.STRING(191), field: "FPP" },
    edad_gestional: { type: DataTypes.STRING(191) },
    menarquia: { type: DataTypes.STRING(191) },
    flujo_genital: { type: DataTypes.STRING(191) },
    gestas: { type: DataTypes.STRING(191) },
    partos: { type: DataTypes.STRING(191) },
    cesareas: { type: DataTypes.STRING(191) },
    abortos: { type: DataTypes.STRING(191) },
  },
  {
    schema: "public",
    tableName: "antecedentes_ginecos_obstreticos",
    timestamps: false,
  },
);
