import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import "dotenv/config";

const sql = fs.readFileSync(path.join(import.meta.dirname, "schema.sql"), "utf8");

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

await conn.query(sql);
console.log("Schema applied to", process.env.DB_NAME);
await conn.end();