// ============================
// 🔹 Profile Controller
// ============================

import Profile from '../models/profileModel.js';
import cloudinary from '../helpers/cloudinary.js';
import streamifier from 'streamifier';
import { userModel } from '../models/userModel.js';
import { generateToken } from '../helpers/authHelper.js';
import { createRedisClients } from "../../shared-config/redisClient.js";
import { validateName, validateUsername, validateBio, validateSocialLinks } from '../helpers/validators.js';

const { pub } = await createRedisClients();

// ============================
// 🔹 Get Profile
// ============================
export const getProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.params.userId }).populate('user', 'name email');
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================
// 🔹 Setup Profile (only name + username)
// ============================
export const setupProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, username } = req.body;
    
    console.log('req.body in set up porfile', req.body)
    console.log('req.body in set up porfile', req.params)

    // ✅ Backend Validation
    const nameError = validateName(name);
    if (nameError) return res.status(400).json({ success: false, message: nameError });

    const usernameError = validateUsername(username);
    if (usernameError) return res.status(400).json({ success: false, message: usernameError });

    // Check if profile already exists
    const existingProfile = await Profile.findOne({ user: userId });
    if (existingProfile) {
      return res.status(400).json({ success: false, message: "Profile already exists" });
    }

    // Check username uniqueness
    const existingUsername = await Profile.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ success: false, message: "Username already taken" });
    }

    // ✅ Create new profile
    const profile = new Profile({ user: userId, name, username });
    await profile.save();

    // ✅ Update user onboarding step
    const user = await userModel.findByIdAndUpdate(
      userId,
      { onboardingStep: 4 },
      { new: true }
    );

    // ✅ Generate token
    const token = generateToken(user);

    // 🔹 Publish unified event
    await pub.publish(
      "userCache:events",
      JSON.stringify({
        event: "userCache:created",
        payload: {
          id: user._id,
          name: profile.name,
          username: profile.username,
          email: user.email,
          profileImage: profile.profileImage,
        },
      })
    );

    const notificationPayload = {
      receiverEmail: user.email,
      entityType: "security",
      message: "You have successfully created account in ByteHive."
    };

    await pub.publish("notification:event", JSON.stringify({ notificationPayload }));

    res.status(201).json({ success: true, message: "Profile created successfully", profile, token });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ============================
// 🔹 Update Profile
// ============================
export const updateProfile = async (req, res) => {
  try {
    const updates = { ...req.body };

    // ✅ Validate name if present
    if (updates.name) {
      const nameError = validateName(updates.name);
      if (nameError) return res.status(400).json({ success: false, message: nameError });
    }

    // ✅ Validate username if present
    if (updates.username) {
      const usernameError = validateUsername(updates.username);
      if (usernameError) return res.status(400).json({ success: false, message: usernameError });

      // Check uniqueness excluding self
      const existingUsername = await Profile.findOne({
        username: updates.username,
        user: { $ne: req.params.userId },
      });
      if (existingUsername) {
        return res.status(400).json({ success: false, message: "Username already taken" });
      }
    }

    // ✅ Validate bio if present
    if (updates.bio) {
      const bioError = validateBio(updates.bio);
      if (bioError) return res.status(400).json({ success: false, message: bioError });
    }

    // ✅ Handle profile image upload
    if (req.file?.buffer) {
      const streamUpload = () =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "profile_images" },
            (error, result) => (result ? resolve(result) : reject(error))
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });

      const result = await streamUpload();
      updates.profileImage = result.secure_url;
    }

    // ✅ Normalize & validate social links only if provided
    const socialsProvided = Object.keys(updates).some((key) => key.startsWith("socialLinks["));
    if (socialsProvided) {
      updates.socialLinks = {
        Linkedin: updates["socialLinks[Linkedin]"] || "",
        Github: updates["socialLinks[Github]"] || "",
        X: updates["socialLinks[X]"] || "",
        Youtube: updates["socialLinks[Youtube]"] || "",
        Instagram: updates["socialLinks[Instagram]"] || "",
        Facebook: updates["socialLinks[Facebook]"] || "",
        Threads: updates["socialLinks[Threads]"] || "",
        Websites: updates["socialLinks[Websites]"] || "",
      };

      const socialErrors = validateSocialLinks(updates.socialLinks);
      if (socialErrors) {
        return res.status(400).json({ success: false, message: socialErrors });
      }

      // Remove raw keys like socialLinks[Linkedin] from updates
      Object.keys(updates).forEach((key) => {
        if (key.startsWith("socialLinks[")) delete updates[key];
      });
    }

    // ✅ Update profile (without auto-upsert!)
    const profile = await Profile.findOneAndUpdate(
      { user: req.params.userId },
      { $set: updates },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    res.json({ success: true, message: "Profile updated successfully", profile });

    const relevantFields = ["name", "username", "profileImage"];
    const changed = relevantFields.some((field) => updates[field]);

    if (changed) {
      const user = await userModel.findById(req.params.userId).select("email");
      console.log('user in updatted profile', user)

      // 🔹 Publish unified event
    await pub.publish(
      "userCache:events",
      JSON.stringify({
        event: "userCache:updated",
        payload: {
          id: req.params.userId,
          name: profile.name,
          username: profile.username,
          email: user.email,
          profileImage: profile.profileImage,
        },
      })
    );
      console.log("📢 Published userCache:updated for cache sync");
    }

  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ success: false, message: "Update failed" });
  }
};

