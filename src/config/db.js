import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default db;

export const testDB = async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM users");

    console.log(result.rows);

    res.status(200).json({
      message: "Database connection successful",
      data: result.rows,
    });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ error: "Database connection error" });
  }
};
