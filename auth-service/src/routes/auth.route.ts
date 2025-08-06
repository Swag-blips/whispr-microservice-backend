import { Router } from "express";
import {
  Login,
  refreshToken,
  register,
  resendOtp,
  resendVerificationEmail,
  resetPassword,
  signInWithGoogle,
  verifyEmail,
  verifyOtp,
} from "../controllers/auth.controller";
import {
  loginSchema,
  otpSchema,
  registrationSchema,
  resendVerificationSchema,
  resetPasswordSchema,
} from "../utils/validate";
import validateRequest from "../middleware/validateRequest";
import authenticateRequest from "../middleware/authenticateRequest";
import { refreshMiddleware } from "../middleware/refreshMiddleware";

const router = Router();

router.post("/register", validateRequest(registrationSchema), register);
router.post("/login", validateRequest(loginSchema), Login);
router.get("/verify-email", verifyEmail);
router.post("/verify-otp", validateRequest(otpSchema), verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/refresh-token", refreshMiddleware, refreshToken);
router.post(
  "/reset-password",
  authenticateRequest,
  validateRequest(resetPasswordSchema),
  resetPassword
);
router.get("/resend-verification-email", validateRequest(resendVerificationSchema), resendVerificationEmail);
router.post("/sign-in-with-google", signInWithGoogle);

export default router;
