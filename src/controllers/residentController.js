// residentController.js
import db from "../config/db.js";
// get : profile

export const getProfile = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const query = `
            SELECT * FROM USERS WHERE USER_ID = $1
        `;
    const values = [user_id];

    const result = await db.query(query, values);
    console.log("result for get resident profile", result.rows[0]);

    return res.status(200).json({
      message: "Profile retrieved successfully",
      result: result.rows[0],
    });
  } catch (error) {
    console.error("Error getting profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// get : previous-payments // done

export const getPreviousPayments = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const query = `
            SELECT * FROM PAYMENTS WHERE USER_ID = $1
        `;
    const values = [user_id];

    const result = await db.query(query, values);
    // console.log("result for get previous payments", result.rows);

    return res.status(200).json({
      message: "Previous payments retrieved successfully",
      result: result.rows,
    });
  } catch (error) {
    console.error("Error getting previous payments:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// get : notifications // done

export const getResidentNotifications = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    //  Find resident flat
    const flatRes = await db.query(
      `SELECT flat_id 
       FROM flat_subscriptions
       WHERE user_id = $1`,
      [user_id],
    );

    let hasPending = false;

    if (flatRes.rows.length > 0) {
      const flat_id = flatRes.rows[0].flat_id;

      //  Check pending records
      const pendingRes = await db.query(
        `SELECT 1
         FROM monthly_records
         WHERE flat_id = $1
         AND status = 'PENDING'
         LIMIT 1`,
        [flat_id],
      );

      hasPending = pendingRes.rows.length > 0;
    }

    // Fetch notifications
    let notifQuery = `
      SELECT notification_id, title, message, created_at, target_type
      FROM notifications
      WHERE target_type = 'ALL'
    `;

    if (hasPending) {
      notifQuery = `
        SELECT notification_id, title, message, created_at, target_type
        FROM notifications
        WHERE target_type IN ('ALL','PENDING')
      `;
    }

    const notifications = await db.query(notifQuery);

    return res.json({
      hasPending,
      notifications: notifications.rows,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Failed to fetch notifications",
    });
  }
};

// patch : update profile // done

export const updateProfile = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { full_name, password } = req.body;

    // Check if at least one field is provided
    if (!full_name && !password) {
      return res.status(400).json({ message: "No fields provided for update" });
    }

    let queryParts = [];
    let values = [];
    let placeholderIndex = 1;

    // Dynamically add full_name if present
    if (full_name) {
      queryParts.push(`FULL_NAME = $${placeholderIndex++}`);
      values.push(full_name);
    }

    // Dynamically add hashed password if present
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 4);
      queryParts.push(`PASSWORD = $${placeholderIndex++}`);
      values.push(hashedPassword);
    }

    // Add the user_id as the final parameter
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
    console.error("Error updating profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// get : current payment due

export const getCurrentMonthDue = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const flatRes = await db.query(
      `
      SELECT flat_id, flat_no, subscription_fees
      FROM flat_subscriptions
      WHERE user_id = $1
    `,
      [user_id],
    );

    if (!flatRes.rows.length) {
      return res.status(404).json({ message: "Flat not found" });
    }

    const flat = flatRes.rows[0];

    const recordRes = await db.query(
      `
      SELECT status, due_date
      FROM monthly_records
      WHERE flat_id = $1
      AND DATE_TRUNC('month', due_date)
          = DATE_TRUNC('month', CURRENT_DATE)
      LIMIT 1
    `,
      [flat.flat_id],
    );

    let isPaid = false;

    if (recordRes.rows.length) {
      isPaid = recordRes.rows[0].status === "PAID";
    }

    return res.json({
      isPaid,
      amount: flat.subscription_fees,
      flat_no: flat.flat_no,
      due_date: recordRes.rows[0]?.due_date,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Failed to fetch due",
    });
  }
};

// post : payment

export const payNow = async (req, res) => {
  console.log("pay-now by resident hit");

  const client = await db.connect();

  try {
    const user_id = req.user.user_id;

    await client.query("BEGIN");

    // 1️ find flat
    const flatRes = await client.query(
      `
      SELECT flat_id, subscription_fees
      FROM flat_subscriptions
      WHERE user_id = $1
    `,
      [user_id],
    );

    if (!flatRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Flat not found" });
    }

    const { flat_id, subscription_fees } = flatRes.rows[0];

    // 2️ find current month record
    const recordRes = await client.query(
      `
      SELECT monthly_record_id, status
      FROM monthly_records
      WHERE flat_id = $1
      AND DATE_TRUNC('month', due_date)
          = DATE_TRUNC('month', CURRENT_DATE)
      LIMIT 1
    `,
      [flat_id],
    );

    if (!recordRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Monthly record not generated",
      });
    }

    const record = recordRes.rows[0];

    // 3️ check already paid (monthly_record OR payments)
    const paymentCheck = await client.query(
      `
      SELECT 1
      FROM payments
      WHERE user_id = $1
      AND DATE_TRUNC('month', payment_date)
          = DATE_TRUNC('month', CURRENT_DATE)
      LIMIT 1
    `,
      [user_id],
    );

    if (record.status === "PAID" || paymentCheck.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Already paid for this month",
      });
    }

    // 4 insert payment
    const payment = await client.query(
      `
      INSERT INTO payments
      (user_id, amount_paid, mode_of_payment, payment_date)
      VALUES ($1,$2,'ONLINE',CURRENT_DATE)
      RETURNING *
    `,
      [user_id, subscription_fees],
    );

    // 5️ update monthly_record
    await client.query(
      `
      UPDATE monthly_records
      SET status = 'PAID'
      WHERE monthly_record_id = $1
    `,
      [record.monthly_record_id],
    );

    await client.query("COMMIT");

    return res.json({
      message: "Payment successful",
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
