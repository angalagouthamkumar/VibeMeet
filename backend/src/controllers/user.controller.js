import httpStatus from "http-status";
import bcrypt, {hash} from "bcrypt";
import {user as UserModel} from "../models/user.model.js";
import crypto from "crypto";

const register = async (req, res) => {
    const { name, username, password } = req.body;

    try{
        const existingUser = await UserModel.findOne({ username });
        if (existingUser) {
            return res.status(httpStatus.FOUND).json({ message: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new UserModel({ name:name, username:username, password:hashedPassword});
        await newUser.save();
        res.status(httpStatus.CREATED).json({ message: "User registered successfully" });
    }
    catch (error) {
        console.error("Error registering user:", error);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
    }

};

const login = async (req, res) => {
    const { username, password } = req.body;
    if(!username||!password){
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Username and password are required" });
    }

    try {
        const user = await UserModel.findOne({ username });
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid Username" });
        }

        let isPasswordValid = await bcrypt.compareSync(password, user.password);
        if (isPasswordValid) {
            let token = crypto.randomBytes(20).toString("hex");
            user.token = token;
            await user.save();
            return res.status(httpStatus.OK).json({ message: "Login successful", token });
        }
        else {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid Password" });
        }
    } catch (error) {
        console.error("Error logging in user:", error);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something Went Wrong" });
    }
};

export {register,login}