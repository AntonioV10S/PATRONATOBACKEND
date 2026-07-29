import { DataTypes } from "sequelize";
import { sequelize } from "../db/conexion.js";

export const AdquisicionModel = sequelize.define(
  "Adquisicion",
  {
    id_adquisicion: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    numeroadqui: { type: DataTypes.STRING(191) },
    precioadqui: { type: DataTypes.DOUBLE },
    descripcionadqui: { type: DataTypes.TEXT },
    documento: { type: DataTypes.STRING(191) },
    fechaadqui: { type: DataTypes.DATEONLY },
    fecharegadqui: { type: DataTypes.DATEONLY },
    tipoadqui: { type: DataTypes.BOOLEAN },
    estadoadqui: { type: DataTypes.BOOLEAN },
  },
  {
    schema: "public",
    tableName: "adquisicions",
    timestamps: false,
  },
);
