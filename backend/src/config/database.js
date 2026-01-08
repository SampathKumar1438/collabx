import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";

export const sequelize = new Sequelize(
  process.env.DB_NAME || "collabx_db",
  process.env.DB_USER || "collabx_db_user",
  process.env.DB_PASSWORD || "collabx_db_password",
  {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    dialect: "postgres",

    logging: process.env.NODE_ENV === "development" ? console.log : false,

    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },

    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },

    dialectOptions: isProd
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false, // REQUIRED for Render
          },
        }
      : {}, // ⬅️ NO SSL locally
  }
);

export default sequelize;
