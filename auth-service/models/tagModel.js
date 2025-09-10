// models/Tag.js
import mongoose from "mongoose";

function slugify(str) {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

const tagSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 48 },
    // Use slug for case-insensitive uniqueness ("AI" vs "ai")
    slug: { type: String, required: true, unique: true, index: true },
    // optional fields you can keep or remove
    isActive: { type: Boolean, default: true },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

// keep slug in sync with name
tagSchema.pre("validate", function (next) {
  if (this.isModified("name")) this.slug = slugify(this.name);
  next();
});

export default mongoose.model("Tag", tagSchema);
