// adminControllers.js

import db from "../config/db.js";
import bcrypt from "bcrypt";

// get // done
export const getAllFlats = async (req, res) => {
  try {
    const query = `
      SELECT 
        f.flat_id,
        f.flat_no,
        s.flat_type,
        s.subscription_fees,
        u.full_name,
        u.user_id,
        u.email
      FROM flat_subscriptions f
      JOIN subscriptions s 
        ON s.subscription_id = f.subscription_id
      LEFT JOIN users u 
        ON u.user_id = f.user_id
      WHERE f.is_active = true
      ORDER BY f.flat_no
    `;

    const result = await db.query(query);

    return res.status(200).json({
      data: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch flats",
    });
  }
};

// get // done
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

// patch // done
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

// get : getFlatById // done

export const getFlatById = async (req, res) => {
  try {
    const { flat_id } = req.params;

    const query = `
      SELECT 
        f.flat_id,
        f.flat_no,
        f.subscription_id,
        s.flat_type,
        s.subscription_fees,
        u.full_name,
        u.user_id,
        u.email
      FROM flat_subscriptions f
      JOIN subscriptions s 
        ON s.subscription_id = f.subscription_id
      LEFT JOIN users u 
        ON u.user_id = f.user_id
      WHERE f.flat_id = $1
    `;

    const result = await db.query(query, [flat_id]);

    if (!result.rows.length) {
      return res.status(404).json({
        message: "Flat not found",
      });
    }

    return res.status(200).json({
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch flat",
    });
  }
};

// put // done
export const updateFlat = async (req, res) => {
  console.log("Update Flat Hit");
  const { flat_id, flat_no, subscription_id, full_name, email } = req.body;

  if (!flat_id || !flat_no || !subscription_id) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // check flat exists
    const flatCheck = await client.query(
      `SELECT user_id FROM flat_subscriptions WHERE flat_id = $1`,
      [flat_id],
    );

    if (!flatCheck.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Flat not found",
      });
    }

    const user_id = flatCheck.rows[0].user_id;

    // update flat
    await client.query(
      `
      UPDATE flat_subscriptions
      SET flat_no = $1,
          subscription_id = $2
      WHERE flat_id = $3
    `,
      [flat_no, subscription_id, flat_id],
    );

    // update user only if resident exists
    if (user_id && full_name && email) {
      await client.query(
        `
        UPDATE users
        SET full_name = $1,
            email = $2
        WHERE user_id = $3
      `,
        [full_name, email, user_id],
      );
    }

    await client.query("COMMIT");

    return res.json({
      message: "Flat updated successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.log(err);

    res.status(500).json({
      message: "Update failed",
    });
  } finally {
    client.release();
  }
};

// post  : add payment

export const addPayment = async (req, res) => {
  // console.log("Add Payment hit");

  const { flat_no, amount_paid, mode_of_payment, month } = req.body;

  if (!flat_no || !amount_paid || !mode_of_payment || !month) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Get flat + resident
    const flatRes = await client.query(
      `
      SELECT flat_id, user_id
      FROM flat_subscriptions
      WHERE flat_no = $1
      AND is_active = true
      `,
      [flat_no]
    );

    if (!flatRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Flat not found",
      });
    }

    const { flat_id, user_id } = flatRes.rows[0];

    if (!user_id) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "No resident assigned to this flat",
      });
    }

    // Get monthly billing record
    const recordRes = await client.query(
      `
      SELECT monthly_record_id, status
      FROM monthly_records
      WHERE flat_id = $1
      AND EXTRACT(MONTH FROM due_date) = $2
      AND EXTRACT(YEAR FROM due_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      LIMIT 1
      `,
      [flat_id, month]
    );

    if (!recordRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Monthly record not found",
      });
    }

    const record = recordRes.rows[0];

    if (record.status === "PAID") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Already paid for this month",
      });
    }

    // Insert payment
    const payment = await client.query(
      `
      INSERT INTO payments
      (user_id, amount_paid, mode_of_payment, payment_date)
      VALUES ($1,$2,$3,CURRENT_DATE)
      RETURNING *
      `,
      [user_id, amount_paid, mode_of_payment]
    );

    // Update billing status
    await client.query(
      `
      UPDATE monthly_records
      SET status = 'PAID'
      WHERE monthly_record_id = $1
      `,
      [record.monthly_record_id]
    );

    await client.query("COMMIT");

    return res.json({
      message: "Payment recorded successfully",
      payment: payment.rows[0],
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.log(err);

    res.status(500).json({
      message: "Payment failed",
    });
  } finally {
    client.release();
  }
};

// get // done
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

// post  : send-notifications // done

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

// patch : update profile // done

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

// delete : delete flat (soft delete) // done

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

// add flat // done
export const addFlat = async (req, res) => {
  const { flat_no, full_name, email, flat_type } = req.body;

  if (!flat_no || !full_name || !email || !flat_type) {
    return res.status(400).json({
      message: "All fields are required",
    });
  }

  try {
    //  find resident
    const userRes = await db.query(
      `
      SELECT user_id 
      FROM users 
      WHERE email = $1 
      AND full_name = $2
      LIMIT 1
      `,
      [email, full_name],
    );

    if (!userRes.rows.length) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const user_id = userRes.rows[0].user_id;

    // find subscription_id using flat_type
    const subRes = await db.query(
      `
      SELECT subscription_id
      FROM subscriptions
      WHERE flat_type = $1
      LIMIT 1
      `,
      [flat_type],
    );

    if (!subRes.rows.length) {
      return res.status(400).json({
        message: "Subscription plan not configured",
      });
    }

    const subscription_id = subRes.rows[0].subscription_id;

    // insert flat
    const insertRes = await db.query(
      `
      INSERT INTO flat_subscriptions
      (flat_no, status, is_active, user_id, subscription_id)
      VALUES ($1,'active',TRUE,$2,$3)
      RETURNING flat_id
      `,
      [flat_no, user_id, subscription_id],
    );

    return res.status(200).json({
      message: "Flat added successfully",
      result: insertRes.rows[0],
    });
  } catch (error) {
    console.error("Error adding flat:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
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
      // TOTAL FLATS
      db.query(`
        SELECT COUNT(*)::int AS total
        FROM flat_subscriptions
        `),

      // OCCUPIED FLATS
      db.query(`
        SELECT COUNT(*)::int AS total
        FROM flat_subscriptions
        WHERE is_active = true
        AND user_id IS NOT NULL
      `),

      // EXPECTED REVENUE
      db.query(`
        SELECT COALESCE(SUM(s.subscription_fees),0)::int AS revenue
        FROM monthly_records mr
        JOIN flat_subscriptions fs
          ON fs.flat_id = mr.flat_id
        JOIN subscriptions s
          ON s.subscription_id = fs.subscription_id
        WHERE DATE_TRUNC('month', mr.due_date)
              = DATE_TRUNC('month', CURRENT_DATE)
        AND fs.is_active = true
      `),

      // COLLECTED REVENUE
      db.query(`
        SELECT COALESCE(SUM(s.subscription_fees),0)::int AS revenue
        FROM monthly_records mr
        JOIN flat_subscriptions fs
          ON fs.flat_id = mr.flat_id
        JOIN subscriptions s
          ON s.subscription_id = fs.subscription_id
        WHERE mr.status = 'PAID'
        AND DATE_TRUNC('month', mr.due_date)
              = DATE_TRUNC('month', CURRENT_DATE)
        AND fs.is_active = true
      `),

      // PENDING FLATS
      db.query(`
        SELECT COUNT(DISTINCT mr.flat_id)::int AS total
        FROM monthly_records mr
        JOIN flat_subscriptions fs
          ON fs.flat_id = mr.flat_id
        WHERE mr.status = 'PENDING'
        AND DATE_TRUNC('month', mr.due_date)
              = DATE_TRUNC('month', CURRENT_DATE)
        AND fs.is_active = true
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
    res.status(500).json({
      message: "Server error",
    });
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
