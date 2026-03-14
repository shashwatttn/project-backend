// adminRoutes.js

import express from "express";
import {
  getAllFlats,
  updateFlatSubscription,
  updateFlatProperties,
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

export default router;
