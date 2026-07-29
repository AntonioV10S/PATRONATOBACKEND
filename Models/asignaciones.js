import { DataTypes } from 'sequelize';
import { sequelize } from '../db/conexion.js';
import { MedicoModel } from './medico.js'; 

export const AsignacionModel = sequelize.define('Asignacion', {
    id_asignacion: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    id_medico_titular: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: MedicoModel,
            key: 'id_cuenta'
        }
    },
    id_medico_reemplazo: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: MedicoModel,
            key: 'id_cuenta'
        }
    },
    fecha_inicio: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    fecha_fin: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    estado: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    schema: 'public',
    tableName: 'asignaciones',
    timestamps: false
});

// Definir las relaciones (Opcional, pero recomendado para consultas avanzadas)
AsignacionModel.belongsTo(MedicoModel, { as: 'Titular', foreignKey: 'id_medico_titular' });
AsignacionModel.belongsTo(MedicoModel, { as: 'Reemplazo', foreignKey: 'id_medico_reemplazo' });