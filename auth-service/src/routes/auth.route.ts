import { Router } from "express";
import {
  Login,
  register,
  verifyEmail,
  verifyOtp,
} from "../controllers/auth.controller";
import { loginSchema, otpSchema, registrationSchema } from "../utils/validate";
import validateRequest from "../middleware/validateRequest";

const router = Router();

router.post("/register", validateRequest(registrationSchema), register);
router.post("/login", validateRequest(loginSchema), Login);
router.get("/verify-email", verifyEmail);
router.post("/verify-otp", validateRequest(otpSchema), verifyOtp);

export default router;
