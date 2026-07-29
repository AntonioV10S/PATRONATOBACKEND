import { DataTypes } from "sequelize";
import { sequelize } from "../db/conexion.js";

export const AntecedentePatologicoFamiliarModel = sequelize.define(
  "AntecedentePatologicoFamiliar",
  {
    id_a_p_familiar: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    id_familiar: { type: DataTypes.BIGINT, allowNull: false },
    id_paciente: { type: DataTypes.BIGINT, allowNull: false },
  },
  {
    schema: "public",
    tableName: "antecedente_patologico_familiares",
    timestamps: false,
  },
);
