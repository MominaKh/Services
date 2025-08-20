import jwt from 'jsonwebtoken';
import { userModel as User } from '../models/userModel.js'; // assuming you're using named export

export const isAuthenticated = async (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select("-password");
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid Token" });
    }
};
