import { hashPassword, comparePassword, generateToken } from "../helpers/authHelper.js";
import sendEmail from "../helpers/sendEmail.js";
import { userModel } from "../models/userModel.js";
import jwt from "jsonwebtoken";
import OTP from "../models/otpModel.js";
import profileModel from "../models/profileModel.js";
import { createRedisClients } from "../../shared-config/redisClient.js";

const { pub } = await createRedisClients();

// ===============================
// Validation Helpers
// ===============================
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return email && emailRegex.test(email) && email.length <= 254;
};

const isValidPassword = (password) => {
  return password && password.length >= 8 && password.length <= 128;
};

// ===============================
// Google Login
// ===============================
export const GoogleLogin = async (req, res) => {
  try {
    if (!req.user) return res.status(400).send("User authentication failed.");

    console.log("req.user", req.user);
    const token = generateToken(req.user);

    res.redirect(`${process.env.FRONTEND_URL}/google-auth?token=${token}`);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

// ===============================
// Login
// ===============================
export const Login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!isValidEmail(email) || !isValidPassword(password)) {
      return res.status(400).json({ message: "Invalid email or password format!" });
    }

    const user = await userModel.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found!" });

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid Password!" });

    const token = generateToken(user);

    await pub.publish(
      "notification:event",
      JSON.stringify({
        notificationPayload: {
          receiverEmail: email,
          entityType: "system",
          triggerType: "login",
          message: `Some login in bytehive`,
        },
      })
    );

    res.json({ success: true, message: "Login successful!", token });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// Forgot Password
// ===============================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const user = await userModel.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found!" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.findOneAndUpdate(
      { email },
      { otp, createdAt: new Date() },
      { upsert: true }
    );

    await pub.publish(
      "notification:event",
      JSON.stringify({
        notificationPayload: {
          receiverEmail: email,
          entityType: "system",
          triggerType: "password-reset",
          message: `<p>Your OTP is: <b>${otp}</b>. Valid for 5 minutes.</p>`,
        },
      })
    );

    res.json({ success: true, message: "OTP sent to your email." });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// Verify Reset OTP
// ===============================
export const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!isValidEmail(email) || !otp) {
      return res.status(400).json({ message: "Invalid email or OTP" });
    }

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

// ===============================
// Reset Password
// ===============================
export const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!isValidEmail(email) || !isValidPassword(password)) {
      return res.status(400).json({ message: "Invalid email or password format!" });
    }

    const hashedPassword = await hashPassword(password);
    await userModel.findOneAndUpdate({ email }, { password: hashedPassword });

    await OTP.deleteOne({ email });

    res.json({ success: true, message: "Password reset successfully!" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// Register
// ===============================
export const Register = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!isValidEmail(email) || !isValidPassword(password)) {
      return res.status(400).json({ msg: "Invalid email or password format!" });
    }

    const existingEmail = await userModel.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ message: "User already exists." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 60 * 1000);

    await OTP.findOneAndUpdate(
      { email },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    await pub.publish(
      "notification:event",
      JSON.stringify({
        notificationPayload: {
          receiverEmail: email,
          entityType: "system",
          triggerType: "register",
          message: `<p>Your OTP is: <b>${otp}</b>. It will expire in 60 seconds.</p>`,
        },
      })
    );

    res.json({ success: true, message: "OTP sent to your email. Please verify." });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// Resend OTP
// ===============================
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!isValidEmail(email)) {
      return res.status(400).json({ msg: "Invalid email format" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 60 * 1000);

    await OTP.findOneAndUpdate(
      { email },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    await pub.publish(
      "notification:event",
      JSON.stringify({
        notificationPayload: {
          receiverEmail: email,
          entityType: "system",
          triggerType: "password-reset",
          message: `<p>Your new OTP is: <b>${otp}</b>. It will expire in 60 seconds.</p>`,
        },
      })
    );

    res.json({ success: true, msg: "OTP resent successfully" });
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// ===============================
// Verify OTP & Register
// ===============================
export const verifyOTPAndRegister = async (req, res) => {
  try {
    const { email, password, otp } = req.body;
    if (!isValidEmail(email) || !isValidPassword(password) || !otp) {
      return res.status(400).json({ msg: "Invalid input or OTP" });
    }

    const validOTP = await OTP.findOne({ email });
    if (!validOTP) return res.status(400).json({ msg: "OTP not found" });
    if (validOTP.otp !== otp) return res.status(400).json({ msg: "Invalid OTP" });
    if (validOTP.expiresAt < new Date()) return res.status(400).json({ msg: "OTP expired" });

    const hashedPassword = await hashPassword(password);
    const user = await userModel.create({
      email,
      password: hashedPassword,
      onboardingStep: 2,
    });

    await OTP.deleteOne({ email });
    const token = generateToken(user);

    res.json({ success: true, msg: "User registered successfully!", token });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ msg: "Server error" });
  }
};
