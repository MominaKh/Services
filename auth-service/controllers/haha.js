import jwt from 'jsonwebtoken';

const user = {
    _id: "68c502e3523199b9df3c4e89",
    email: "ahmadmaaz110010@gmail.com",
    onboardingStep: 4,
};

// Secret key
const secret = "asda$%a@44yas%";

// 1️⃣ Generate token
const token = jwt.sign(
    { _id: user._id, email: user.email, onboardingStep: user.onboardingStep },
    secret,
    { expiresIn: '7d' }
);

console.log('Generated Token:', token);

// 2️⃣ Decode / Verify token
try {
    const decoded = jwt.verify(token, secret);
    console.log('Decoded Token:', decoded);
} catch (err) {
    console.error('Token verification failed:', err.message);
}
