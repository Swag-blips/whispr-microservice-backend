import { Router } from "express";
import {
  Login,
  refreshToken,
  register,
  resendOtp,
  resetPassword,
  verifyEmail,
  verifyOtp,
} from "../controllers/auth.controller";
import {
  loginSchema,
  otpSchema,
  registrationSchema,
  resetPasswordSchema,
} from "../utils/validate";
import validateRequest from "../middleware/validateRequest";
import authenticateRequest from "../middleware/authenticateRequest";

const router = Router();

router.post("/register", validateRequest(registrationSchema), register);
router.post("/login", validateRequest(loginSchema), Login);
router.get("/verify-email", verifyEmail);
router.post("/verify-otp", validateRequest(otpSchema), verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/refresh-token", refreshToken);
router.post(
  "/reset-password",
  authenticateRequest,
  validateRequest(resetPasswordSchema),
  resetPassword
);

export default router;
