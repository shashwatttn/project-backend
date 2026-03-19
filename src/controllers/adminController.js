// adminControllers.js

import db from "../config/db.js";
import bcrypt from "bcrypt";

// get // done
export const getAllFlats = async (req, res) => {
  // console.log("flat api hit");
  try {
    const query = `
      SELECT 
        f.flat_id,
        f.flat_no,
        f.flat_type,
        u.full_name,
        u.user_id,
        u.email
      FROM flat_subscriptions f
      JOIN users u ON u.user_id = f.user_id
      WHERE f.is_active = true
      ORDER BY f.flat_no
    `;

    const result = await db.query(query);
    // console.log("flats :", result);
    return res.status(200).json({
      data: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch flats" });
  }
};

// get
export const getSubscriptionPlans = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        subscription_fees,
        flat_type
      FROM subscriptions
    `);

    return res.status(200).json({
      plans: result.rows,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Failed to fetch subscription plans",
    });
  }
};

// patch
export const updateFlatSubscription = async (req, res) => {
  const { flat_type, subscription_fees } = req.body;

  try {
    const query = `
            UPDATE subscriptions
            SET subscription_fees = $1
            WHERE flat_type = $2
        `;

    const values = [subscription_fees, flat_type];

    await db.query(query, values);

    return res.status(200).json({
      message: "Flat subscription updated successfully",
    });
  } catch (error) {
    console.error("Error updating flat subscription:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// put
export const updateFlatProperties = async (req, res) => {
  const { flat_id, flat_no, user_name, email, flat_type } = req.body;

  try {
    const query1 = `
            UPDATE flat_subscriptions
            SET flat_no = $1,
                flat_type = $2
            WHERE flat_id = $3
        `;
    const values1 = [flat_no, flat_type, flat_id];

    await db.query(query1, values1);

    const query2 = `
            UPDATE USERS
            SET FULL_NAME = $1,
                EMAIL = $2
            WHERE USER_ID = (SELECT USER_ID FROM FLAT_SUBSCRIPTIONS WHERE FLAT_ID = $3)
        `;
    const values2 = [user_name, email, flat_id];
    await db.query(query2, values2);
    return res.status(200).json({
      message: "Flat properties updated successfully",
    });
  } catch (error) {
    console.error("Error updating flat properties:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// post  : add payment

export const addPayment = async (req, res) => {
  try {
    const { flat_id, amount_paid, mode_of_payment, payment_date } = req.body;

    if (!flat_id || !amount_paid || !mode_of_payment) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Find user living in this flat
    const flatResult = await db.query(
      `SELECT user_id FROM flat_subscriptions WHERE flat_id = $1`,
      [flat_id],
    );

    if (flatResult.rows.length === 0) {
      return res.status(404).json({ message: "Flat not found" });
    }

    const user_id = flatResult.rows[0].user_id;

    if (!user_id) {
      return res.status(400).json({
        message: "No resident assigned to this flat",
      });
    }

    // Insert Payment
    const paymentInsert = await db.query(
      `INSERT INTO payments (user_id, amount_paid, mode_of_payment, payment_date)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [user_id, amount_paid, mode_of_payment, payment_date || new Date()],
    );

    // Get latest pending monthly record
    const recordResult = await db.query(
      `
        SELECT monthly_record_id
        FROM monthly_records
        WHERE flat_id = $1
        AND DATE_TRUNC('month', due_date)
              = DATE_TRUNC('month', CURRENT_DATE)
        LIMIT 1
`,
      [flat_id],
    );

    if (recordResult.rows.length > 0) {
      const record_id = recordResult.rows[0].monthly_record_id;

      await db.query(
        `UPDATE monthly_records
         SET status = 'PAID'
         WHERE monthly_record_id = $1`,
        [record_id],
      );
    }

    return res.status(201).json({
      message: "Payment added successfully",
      payment: paymentInsert.rows[0],
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

// get   : monthly-records

export const getMonthlyRecords = async (req, res) => {
  try {
    const query = `
            SELECT 
                * from monthly_records
        `;

    const result = await db.query(query);

    console.log("monthly records", result.rows);

    return res.status(200).json({
      message: "Monthly records retrieved successfully",
      result: result.rows,
    });
  } catch (error) {
    console.error("Error getting monthly records:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getPreviousPayments = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.payment_id,
        u.full_name,
        u.email,
        p.amount_paid,
        p.mode_of_payment,
        p.payment_date
      FROM payments p
      JOIN users u 
        ON p.user_id = u.user_id
      ORDER BY p.payment_date DESC
    `;

    const result = await db.query(query);

    return res.status(200).json({
      message: "Previous payments retrieved successfully",
      result: result.rows,
    });
  } catch (error) {
    console.error("Error getting previous payments:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
// post  : send-notifications

export const sendNotifications = async (req, res) => {
  try {
    const { title, message, target_type } = req.body;

    const result = await db.query(
      `
      INSERT INTO notifications
      (title, message, target_type, created_at)
      VALUES ($1,$2,$3,CURRENT_DATE)
      RETURNING *
    `,
      [title, message, target_type],
    );

    return res.json({
      message: "Notification sent",
      result: result.rows[0],
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};

// get  :  profile

// export const getAdminProfile = async (req, res) => {
//   try {
//     const user_id = req.user.user_id;

//     const query = `
//             SELECT * FROM USERS WHERE USER_ID = $1
//         `;
//     const values = [user_id];

//     const result = await db.query(query, values);

//     return res.status(200).json({
//       message: "Admin profile retrieved successfully",
//       result: result.rows[0],
//     });
//   } catch (error) {
//     console.error("Error getting admin profile:", error);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// };

// patch : update profile

export const updateAdminProfile = async (req, res) => {
  console.log("update admin profile hit");

  const user_id = req.user.user_id;
  const { full_name, password } = req.body;

  try {
    if (!full_name && !password) {
      return res.status(400).json({
        message: "No fields provided for update",
      });
    }

    let queryParts = [];
    let values = [];
    let placeholderIndex = 1;

    if (full_name) {
      queryParts.push(`FULL_NAME = $${placeholderIndex++}`);
      values.push(full_name);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 4);
      queryParts.push(`PASSWORD = $${placeholderIndex++}`);
      values.push(hashedPassword);
    }

    values.push(user_id);
    const query = `
      UPDATE USERS 
      SET ${queryParts.join(", ")} 
      WHERE USER_ID = $${placeholderIndex}
      RETURNING USER_ID, FULL_NAME, EMAIL, ROLE
    `;

    const result = await db.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      result: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating admin profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// delete : delete flat (soft delete)

export const deleteFlat = async (req, res) => {
  try {
    const flat_id = req.body.flat_id;

    const query = `
                UPDATE FLAT_SUBSCRIPTIONS
                SET IS_ACTIVE = FALSE
                WHERE FLAT_ID = $1
        `;
    const values = [flat_id];

    await db.query(query, values);

    return res.status(200).json({
      message: "Flat deleted successfully",
    });
  } catch (error) {
    console.log("Error deleting the flat :", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getFeesByFlatType = async (res) => {
  try {
  } catch (error) {}
};

// add flat
export const addFlat = async (req, res) => {
  const { flat_no, full_name, email, flat_type } = req.body;

  if (!flat_no || !full_name || !email || !flat_type) {
    return res.status(400).json({
      message: "All fields are required",
    });
  }

  try {
    const query1 = `
            SELECT USER_ID FROM USERS WHERE EMAIL = $1 AND full_name = $2
        `;
    const values1 = [email, full_name];

    const result1 = await db.query(query1, values1);

    if (result1.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const user_id = result1.rows[0].user_id;

    const maxFlatIdQuery = `SELECT MAX(FLAT_ID) FROM FLAT_SUBSCRIPTIONS`;

    const maxFlatIdResult = await db.query(maxFlatIdQuery);
    let flat_id = maxFlatIdResult.rows[0].max;
    // console.log("flat_id :", flat_id);
    flat_id++;

    const query2 = `
            INSERT INTO FLAT_SUBSCRIPTIONS (FLAT_ID,FLAT_NO,FLAT_TYPE,STATUS,IS_ACTIVE,USER_ID)
            VALUES ($1,$2,$3,'active',TRUE,$4) RETURNING FLAT_ID
        `;
    const values2 = [flat_id, flat_no, flat_type, user_id];

    const result2 = await db.query(query2, values2);

    // const flat_id = result2.rows[0].flat_id;

    return res.status(200).json({
      message: "Flat added successfully",
      result: result2.rows[0],
    });
  } catch (error) {
    console.error("Error adding flat:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// get :  dashboard data // done

export const getAdminDashboardStats = async (req, res) => {
  try {
    const [
      totalFlats,
      occupied,
      expectedRevenue,
      collectedRevenue,
      pendingFlats,
    ] = await Promise.all([
      db.query(`
        SELECT COUNT(*)::int AS total
        FROM flat_subscriptions
        `),

      db.query(`
        SELECT COUNT(*)::int AS total
        FROM flat_subscriptions
        WHERE is_active = true
        AND user_id IS NOT NULL
      `),

      db.query(`
        SELECT COALESCE(SUM(fs.subscription_fees),0)::int AS revenue
        FROM monthly_records mr
        JOIN flat_subscriptions fs
          ON fs.flat_id = mr.flat_id
        WHERE DATE_TRUNC('month', mr.due_date)
              = DATE_TRUNC('month', CURRENT_DATE) AND FS.IS_ACTIVE = TRUE
      `),

      db.query(`
        SELECT COALESCE(SUM(fs.subscription_fees),0)::int AS revenue
        FROM monthly_records mr
        JOIN flat_subscriptions fs
          ON fs.flat_id = mr.flat_id
        WHERE mr.status = 'PAID'
        AND DATE_TRUNC('month', mr.due_date)
              = DATE_TRUNC('month', CURRENT_DATE)
      `),

      db.query(`
        SELECT COUNT(DISTINCT flat_id)::int AS total
        FROM monthly_records
        WHERE status = 'PENDING'
        AND DATE_TRUNC('month', due_date)
              = DATE_TRUNC('month', CURRENT_DATE)
      `),
    ]);

    return res.json({
      totalFlats: totalFlats.rows[0].total,
      occupiedFlats: occupied.rows[0].total,
      expectedRevenue: expectedRevenue.rows[0].revenue,
      collectedRevenue: collectedRevenue.rows[0].revenue,
      pendingFlats: pendingFlats.rows[0].total,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};

// get : reports data // done

export const getPaymentReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = "";
    let values = [];

    if (startDate && endDate) {
      dateFilter = `AND mr.due_date BETWEEN $1 AND $2`;
      values = [startDate, endDate];
    }

    const summaryQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE mr.status = 'PAID') AS total_paid_flats,
        COUNT(*) FILTER (WHERE mr.status != 'PAID') AS total_pending_flats,
        COALESCE(SUM(p.amount_paid),0) AS total_collection
      FROM monthly_records mr
      LEFT JOIN flat_subscriptions fs ON fs.flat_id = mr.flat_id
      LEFT JOIN payments p ON p.user_id = fs.user_id
      WHERE 1=1 ${dateFilter}
    `;

    const summaryResult = await db.query(summaryQuery, values);

    // Detailed Report Rows
    const reportQuery = `
      SELECT
        fs.flat_no,
        u.full_name,
        mr.due_date,
        mr.status,
        COALESCE(SUM(p.amount_paid),0) AS amount_paid
      FROM monthly_records mr
      JOIN flat_subscriptions fs ON fs.flat_id = mr.flat_id
      LEFT JOIN users u ON u.user_id = fs.user_id
      LEFT JOIN payments p ON p.user_id = u.user_id
      WHERE 1=1 ${dateFilter}
      GROUP BY fs.flat_no, u.full_name, mr.due_date, mr.status
      ORDER BY mr.due_date DESC
    `;

    const reportRows = await db.query(reportQuery, values);

    return res.status(200).json({
      summary: summaryResult.rows[0],
      reportRows: reportRows.rows,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Error generating reports",
    });
  }
};
