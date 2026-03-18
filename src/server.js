import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import residentRoutes from "./routes/residentRoutes.js";
// import { testDB } from "./config/db.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/resident", residentRoutes);

const PORT = process.env.PORT;

// app.get("/testdb", testDB);


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
