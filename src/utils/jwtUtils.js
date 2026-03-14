import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const generateToken = (user) => {
  return new Promise((resolve, reject) => {
    const payload = {
      user_id: user?.user_id,
      email: user?.email,
      role: user?.role,
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "30d" },
      (err, token) => {
        if (err) {
          reject(err);
        } else {
          resolve(token);
        }
      },
    );
  });
};
