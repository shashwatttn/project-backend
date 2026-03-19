// residentRoutes.js

import express from "express";
import { authenticate } from "../middleware/middleware.js";
import { isResident } from "../middleware/isResident.js";
import {
  getProfile,
  getPreviousPayments,
  getResidentNotifications,
  updateProfile,
  payNow,
  getCurrentMonthDue,
} from "../controllers/residentController.js";

const router = express.Router();

// router.get("/profile", authenticate, isResident, getProfile);
router.get("/previous-payments", authenticate, isResident, getPreviousPayments);
router.get(
  "/notifications",
  authenticate,
  isResident,
  getResidentNotifications,
);
router.get("/current-due", authenticate, isResident, getCurrentMonthDue);
router.patch("/update-profile", authenticate, isResident, updateProfile);
router.post("/pay-now", authenticate, isResident, payNow);

export default router;
