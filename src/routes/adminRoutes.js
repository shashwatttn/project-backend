// adminRoutes.js

import express from "express";
import {
  getAllFlats,
  updateFlatSubscription,
  getAdminDashboardStats,
  getPaymentReports,
  updateAdminProfile,
  getSubscriptionPlans,
  addFlat,
  deleteFlat,
  getFlatById,
  updateFlat,
  addPayment,
  sendNotifications
} from "../controllers/adminController.js";
import { authenticate } from "../middleware/middleware.js";
import { isAdmin } from "../middleware/isAdmin.js";
import { auth } from "google-auth-library";

const router = express.Router();

router.get("/flats", authenticate, isAdmin, getAllFlats);

router.patch(
  "/flats/subscription",
  authenticate,
  isAdmin,
  updateFlatSubscription,
  sendNotifications
);
router.put("/update-flat", authenticate, isAdmin, updateFlat);

router.get("/dashboard-stats", authenticate, isAdmin, getAdminDashboardStats);

router.get("/reports", authenticate, isAdmin, getPaymentReports);

router.get("/subscription-plans", authenticate, isAdmin, getSubscriptionPlans);

router.get("/flats/:flat_id",authenticate,isAdmin,getFlatById);

router.patch("/update-profile", authenticate, isAdmin, updateAdminProfile);

router.post("/add-flat", authenticate, isAdmin, addFlat);

router.delete("/delete-flat", authenticate, isAdmin, deleteFlat);

router.post("/add-payment", authenticate, isAdmin, addPayment);

router.post("/send-notification",authenticate,isAdmin,sendNotifications)

export default router;
