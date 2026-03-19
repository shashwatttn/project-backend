// adminRoutes.js

import express from "express";
import {
  getAllFlats,
  updateFlatSubscription,
  updateFlatProperties,
  getAdminDashboardStats,
  getPaymentReports,
  updateAdminProfile,
  getSubscriptionPlans,
  addFlat
} from "../controllers/adminController.js";
import { authenticate } from "../middleware/middleware.js";
import { isAdmin } from "../middleware/isAdmin.js";

const router = express.Router();

router.get("/flats", authenticate, isAdmin, getAllFlats);

router.patch(
  "/flats/subscription",
  authenticate,
  isAdmin,
  updateFlatSubscription,
);
router.put("/flats/properties", authenticate, isAdmin, updateFlatProperties);

router.get("/dashboard-stats", authenticate, isAdmin, getAdminDashboardStats);

router.get("/reports", authenticate, isAdmin, getPaymentReports);

router.get("/subscription-plans", authenticate, isAdmin, getSubscriptionPlans);

router.patch("/update-profile", authenticate, isAdmin, updateAdminProfile);

router.post("/add-flat", authenticate, isAdmin, addFlat);

export default router;
