import { Router } from "express";
import { register, verifyEmail } from "../controllers/auth.controller";
import { loginSchema, registrationSchema } from "../utils/validate";
import validateRequest from "../middleware/validateRequest";

const router = Router();

router.post("/register", validateRequest(registrationSchema), register);
router.get("/verify-email", validateRequest(loginSchema), verifyEmail);

export default router;
