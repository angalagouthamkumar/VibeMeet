import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import connectToSocket from "./controllers/socketManager.js";
import userRoutes from "./routes/users.route.js";

// Load environment variables before doing anything else
dotenv.config();

const app = express();
const server = createServer(app);

// Connect socket server manager instance
const io = connectToSocket(server);

// App Configurations
app.set("port", process.env.PORT || 3000);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount user routes matching frontend base path prefix
app.use("/api/v1/users", userRoutes);

const start = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is undefined. Check your saved .env file configuration.");
    }

    // 1. First, wait for a secure connection to your database cluster
    await mongoose.connect(mongoUri);
    console.log("Successfully connected to MongoDB Database.");

    // 2. Once the database is ready, safely expose your port to accept traffic
    server.listen(app.get("port"), () => {
      console.log(`Server is running flawlessly on port ${app.get("port")}`);
    });

  } catch (error) {
    console.error("Critical Backend initialization failed:", error.message || error);
    process.exit(1); // Safely terminate the process on a connection error
  }
};

start();