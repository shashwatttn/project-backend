import db from "../config/db.js";

export const isAdmin = async (req, res, next) => {
  //   console.log("--- isAdmin Middleware Debug ---");
  //   console.log("User:",req.user)
  try {
    const user_id = req.user.user_id;

    const query = `
        SELECT role FROM USERS WHERE USER_ID = $1
    `;
    const values = [user_id];

    const result = await db.query(query, values);

    if (result.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    next();
  } catch (error) {
    console.error("Error checking admin role:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
