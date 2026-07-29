import { DataTypes } from "sequelize";
import { sequelize } from "../db/conexion.js";

export const AuditoriaCryptoModel = sequelize.define(
  "AuditoriaCrypto",
  {
    id_auditoria: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    id_cuenta: { type: DataTypes.BIGINT },
    tabla_afectada: { type: DataTypes.STRING(100), allowNull: false },
    id_registro: { type: DataTypes.BIGINT, allowNull: false },
    operacion: { type: DataTypes.STRING(50), allowNull: false },
    resultado: { type: DataTypes.BOOLEAN, allowNull: false },
    ip_origen: { type: DataTypes.STRING(45) },
    fecha_hora: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    detalle: { type: DataTypes.TEXT },
  },
  {
    schema: "public",
    tableName: "auditoria_crypto",
    timestamps: false,
  },
);
