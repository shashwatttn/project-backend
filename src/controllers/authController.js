// authController.js

import db from "../config/db.js";
import { generateToken } from "../utils/jwtUtils.js";
import bcrypt from "bcrypt";

export const register = async (req, res) => {
  console.log(`Register URL hit`);
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // check if user exists
    const query = "Select * from users where email = $1";
    const values = [email];

    const result = await db.query(query, values);

    if (result.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const role = "resident";
    const fullName = email;

    const hashedPassword = await bcrypt.hash(password, 4);

    const insertQuery = `INSERT INTO users (full_name, email, password , role) 
      VALUES ($1, $2, $3, $4)
       RETURNING user_id, full_name, email, role`;
    const insertValues = [fullName, email, hashedPassword, role];

    const result_final = await db.query(insertQuery, insertValues);

    const user = result_final.rows[0];
    const token = await generateToken(user);

    return res
      .status(201)
      .json({ message: "User registered successfully", user, token });
  } catch (error) {
    console.error("Error registering user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req, res) => {
  console.log(`Login url hit`);
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const query = `SELECT * FROM users WHERE email = $1`;
    const values = [email];

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = await generateToken(user);

    return res
      .status(200)
      .json({
        message: "Login successful",
        user: { ...user, password: "" },
        token,
      });
  } catch (error) {
    console.error("Error logging in:", error);

    return res.status(500).json({ error: "Internal server error" });
  }
};
