import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import connectToSocket from "./controllers/socketManager.js";
import userRoutes from "./routes/users.route.js";


dotenv.config();

const app = express();
const server = createServer(app);


const io = connectToSocket(server);


app.set("port", process.env.PORT || 3000);
app.use(cors({
    origin: "https://vibe-meet-eta.vercel.app", 
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use("/api/v1/users", userRoutes);

const start = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is undefined. Check your saved .env file configuration.");
    }


    await mongoose.connect(mongoUri);
    console.log("Successfully connected to MongoDB Database.");

 
    server.listen(app.get("port"), () => {
      console.log(`Server is running flawlessly on port ${app.get("port")}`);
    });

  } catch (error) {
    console.error("Critical Backend initialization failed:", error.message || error);
    process.exit(1); 
  }
};

start();