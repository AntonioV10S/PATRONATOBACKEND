import { Sequelize } from "sequelize";
import dotenv from "dotenv";


dotenv.config();

export const sequelize = new Sequelize(
  process.env.DB_NAME, 
  process.env.DB_USER, 
  process.env.DB_PASSWORD, 
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    port: process.env.DB_PORT,
    logging: false, 
  }
);

sequelize.authenticate()
  .then(() => console.log('Conexión a PostgreSQL establecida con éxito.'))
  .catch(err => console.error('No se pudo conectar a la base de datos:', err));