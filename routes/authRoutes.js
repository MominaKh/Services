import express from 'express';
import passport from 'passport';
import {
  GoogleLogin,
  Login,
  Register,
  verifyOTPAndRegister,
  resendOTP,
  forgotPassword,
  verifyResetOtp,
  resetPassword
} from '../controllers/authController.js';

const router = express.Router();

// Google OAuth Login
router.get('/google', (req, res, next) => {
  const mode = req.query.mode;
  if (!mode || (mode !== "login" && mode !== "register")) {
    return res.status(400).send("Invalid mode. Use mode=login or mode=register.");
  }

  passport.authenticate('google', {
    scope: ["profile", "email"],
    session: false,
    state: mode,
    prompt: "select_account"
  })(req, res, next);
});

// Google OAuth Callback
router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
      if (err) {
        return res.redirect(`${process.env.FRONTEND_URL}/google-auth?error=${encodeURIComponent("Authentication failed. Please try again.")}`);
      }

      if (!user) {
        return res.redirect(`${process.env.FRONTEND_URL}/google-auth?error=${encodeURIComponent(info?.message || "Authentication failed.")}`);
      }

      req.user = user;
      next();
    })(req, res, next);
  },
  GoogleLogin
);

// Routes
router.post('/login', Login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);
router.post('/register', Register);
router.post('/verify-otp', verifyOTPAndRegister);
router.post('/resend-otp', resendOTP);

export default router;
