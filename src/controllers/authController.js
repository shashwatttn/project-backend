// authController.js

import db from "../config/db.js";
import { generateToken } from "../utils/jwtUtils.js";
import bcrypt from "bcrypt";
import {OAuth2Client} from "google-auth-library";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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


export const googleAuth = async (req, res) => {
  try {

    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const email = payload.email;
    const googleId = payload.sub;
    const fullName = payload.name || email;

    // check ANY user with this email
    let result = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    let user;

    if (result.rows.length === 0) {

      // GOOGLE REGISTER → ALWAYS RESIDENT
      const newUser = await db.query(
        `INSERT INTO users (full_name, email, role, google_id)
         VALUES ($1, $2, 'resident', $3)
         RETURNING *`,
        [fullName, email, googleId]
      );

      user = newUser.rows[0];

    } else {

      //  GOOGLE LOGIN
      user = result.rows[0];

      // ACCOUNT LINKING CASE
      if (!user.google_id) {
        await db.query(
          `UPDATE users SET google_id = $1 WHERE user_id = $2`,
          [googleId, user.user_id]
        );

        user.google_id = googleId;
      }
    }

    const jwtToken = await generateToken(user);

    return res.status(200).json({
      message: "Google Auth Success",
      token: jwtToken,
      role: user.role,
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Google Authentication Failed",
    });
  }
};