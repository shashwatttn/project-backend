import db from "../config/db.js";

export const isResident = async (req, res, next) => {
    // console.log("--- isResident Middleware Debug ---");
    // console.log("User:",req.user)
  try {
    const user_id = req.user.user_id;

    const query = `
            SELECT role FROM USERS WHERE USER_ID = $1
        `;
    const values = [user_id];

    const result = await db.query(query, values);

    if (result.rows[0].role !== "resident") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    next();
  } catch (error) {
    console.error("Error checking resident role:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
