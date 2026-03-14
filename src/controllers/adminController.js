// adminControllers.js

import db from "../config/db.js";

// get
export const getAllFlats = async (req, res) => {
  try {
    const query = `
            SELECT *
                FROM 
                        USERS U
                JOIN    FLAT_SUBSCRIPTIONS F
                ON U.USER_ID = F.USER_ID
                WHERE IS_ACTIVE IS TRUE  

        `;

    const result = await db.query(query);

    return res.status(200).json({
      message: "Flats retrieved successfully",
      data: result.rows,
    });
  } catch (error) {
    console.error("Error retrieving flats:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// patch
export const updateFlatSubscription = async (req, res) => {
  const { flat_type , subscription_fees } = req.body;

  try {
    const query = `
            UPDATE FLAT_SUBSCRIPTIONS
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
            UPDATE FLAT_SUSCRIPTIONS
            SET FLAT_NO = $1,
                FLAT_TYPE = $2
            `;

    const values1 = [flat_no, flat_type];

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
        
    } catch (error) {
        console.error("Error adding payment:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}   

// get   : monthly-records

export const getMonthlyRecords = async (req, res) => {
    try {
        
    } catch (error) {
        console.error("Error getting monthly records:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

// post  : send-notifications

export const sendNotifications = async (req, res) => {
    try {
        const { title, message } = req.body;

        const query = `
            INSERT INTO NOTIFICATIONS (TITLE, MESSAGE)
            VALUES ($1, $2) RETURNING *
        `;
        const values = [title, message];

        const result = await db.query(query, values);

        return res.status(200).json({
            message: "Notification sent successfully",
            result : result.rows[0]
        });
    } catch (error) {
        console.error("Error sending notification:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

// get  :  profile

export const getAdminProfile = async (req, res) => {
    try {
        const user_id = req.user.user_id;

        const query = `
            SELECT * FROM USERS WHERE USER_ID = $1
        `;
        const values = [user_id];

        const result = await db.query(query, values);

        return res.status(200).json({
            message: "Admin profile retrieved successfully",
            result : result.rows[0]
        });
    } catch (error) {
        console.error("Error getting admin profile:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}


// patch : update profile

export const updateAdminProfile = async (req, res) => {
    const {user_id, full_name , password} = req.body;

    try{

        const hashedPassword = await bcrypt.hash(password, 4);
        
        const query = `UPDATE USERS SET FULL_NAME = $1, PASSWORD = $2 WHERE USER_ID = $3 RETURNING *`;
        const values = [full_name, hashedPassword, user_id];

        const result = await db.query(query, values);

        return res.status(200).json({
            message: "Admin profile updated successfully",
            result : result.rows[0]
        });
    }catch(error){
        console.error("Error updating admin profile:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

// delete : delete flat (soft delete)

// add flat
export const addFlat = async (req, res) => {
  const { flat_no, full_name, email, flat_type } = req.body;
  try {
    const query1 = `

        `;
  } catch (error) {
    console.error("Error adding flat:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// get :  dashboard data

export const getDashboardData = async (req, res) => {
    try {
        
        const query = `
            SELECT from payments p
            JOIN flat_subscriptions fs
            ON p.flat_id = fs.flat_id

        `;
        
    } catch (error) {
        console.error("Error getting dashboard data:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
    