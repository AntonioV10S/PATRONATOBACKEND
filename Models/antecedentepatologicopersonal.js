import { DataTypes } from "sequelize";
import { sequelize } from "../db/conexion.js";

export const AntecedentePatologicoPersonalModel = sequelize.define(
  "AntecedentePatologicoPersonal",
  {
    id_patologico: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    id_gineco: { type: DataTypes.BIGINT },
    infancia: { type: DataTypes.STRING(191) },
    adolecencia: { type: DataTypes.STRING(191) },
    adultez: { type: DataTypes.STRING(191) },
    DBID: { type: DataTypes.STRING(191), field: "DBID" },
    HTA: { type: DataTypes.STRING(191), field: "HTA" },
    TbP: { type: DataTypes.STRING(191), field: "TbP" },
    DBI: { type: DataTypes.STRING(191), field: "DBI" },
    quirujircos: { type: DataTypes.STRING(191) },
    alergias_enc: { type: DataTypes.TEXT },
    traumas_enc: { type: DataTypes.TEXT },
  },
  {
    schema: "public",
    tableName: "antecedentes_patologicos_personales",
    timestamps: false,
  },
);
