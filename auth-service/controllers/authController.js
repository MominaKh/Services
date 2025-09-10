import { hashPassword, comparePassword, generateToken } from "../helpers/authHelper.js";
import sendEmail from "../helpers/sendEmail.js";
import { userModel } from "../models/userModel.js";
import jwt from "jsonwebtoken";
import OTP from "../models/otpModel.js";
import profileModel from "../models/profileModel.js";

export const GoogleLogin = async (req, res) => {
    try {
        if (!req.user) return res.status(400).send("User authentication failed.");
        console.log('req.user', req.user)
        const token = generateToken(req.user);
        res.redirect(`${process.env.FRONTEND_URL}/google-auth?token=${token}`);
    } catch (error) {
        res.status(500).send("Internal Server Error");
    }
};

export const Login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Email & Password are required!" });

        const user = await userModel.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found!" });

        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid Password!" });

        const token = generateToken(user);
        res.json({ success: true, message: "Login successful!", token });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });

        const user = await userModel.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found!" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await OTP.findOneAndUpdate({ email }, { otp, createdAt: new Date() }, { upsert: true });

        await sendEmail(email, "Password Reset OTP", `<p>Your OTP is: <b>${otp}</b>. Valid for 60 seconds.</p>`);
        res.json({ success: true, message: "OTP sent to your email." });
    } catch (err) {
        console.error("Forgot Password Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const verifyResetOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

        const validOTP = await OTP.findOne({ email });
        if (!validOTP) return res.status(400).json({ message: "OTP not found!" });

        const elapsed = (Date.now() - new Date(validOTP.createdAt).getTime()) / 1000;
        if (elapsed > 60) return res.status(400).json({ message: "OTP expired" });

        if (validOTP.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

        res.json({ success: true, message: "OTP verified" });
    } catch (err) {
        console.error("OTP Verification Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Email and New Password are required" });

        const hashedPassword = await hashPassword(password);
        await userModel.findOneAndUpdate({ email }, { password: hashedPassword });

        await OTP.deleteOne({ email });
        res.json({ success: true, message: "Password reset successfully!" });
    } catch (err) {
        console.error("Reset Password Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const Register = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ msg: "All fields are required!" });

        const existingEmail = await userModel.findOne({ email });
        if (existingEmail) return res.status(409).json({ message: "User already exists." });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 60 * 1000);

        await OTP.findOneAndUpdate({ email }, { otp, expiresAt }, { upsert: true, new: true });
        await sendEmail(email, "Your OTP Code", `<p>Your OTP is: <b>${otp}</b>. It will expire in 60 seconds.</p>`);

        res.json({ success: true, message: "OTP sent to your email. Please verify." });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ msg: "Email is required" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 60 * 1000);

        await OTP.findOneAndUpdate({ email }, { otp, expiresAt }, { upsert: true, new: true });
        await sendEmail(email, "Your OTP Code", `<p>Your new OTP is: <b>${otp}</b>. It will expire in 60 seconds.</p>`);

        res.json({ success: true, msg: "OTP resent successfully" });
    } catch (error) {
        console.error("Error resending OTP:", error);
        res.status(500).json({ msg: "Server error" });
    }
};

export const verifyOTPAndRegister = async (req, res) => {
    try {
        const {  email, password, otp } = req.body;
        if (!email || !password || !otp) {
            return res.status(400).json({ msg: "All fields and OTP are required!" });
        }

        const validOTP = await OTP.findOne({ email });
        if (!validOTP) return res.status(400).json({ msg: "OTP not found" });
        if (validOTP.otp !== otp) return res.status(400).json({ msg: "Invalid OTP" });
        if (validOTP.expiresAt < new Date()) return res.status(400).json({ msg: "OTP expired" });

        const hashedPassword = await hashPassword(password);
        const user = await userModel.create({email, password: hashedPassword, onboardingStep: 2});

        // await profileModel.create({
        //     user: user._id,
        //     name: user.username,
        //     bio: '',
        //     socials: {},
        // });

        await OTP.deleteOne({ email });
        const token = generateToken(user);

        res.json({ success: true, msg: "User registered successfully!", token });
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({ msg: "Server error" });
    }
};
