import { Router } from "express";
import { Login, register, verifyEmail } from "../controllers/auth.controller";
import { loginSchema, registrationSchema } from "../utils/validate";
import validateRequest from "../middleware/validateRequest";

const router = Router();

router.post("/register", validateRequest(registrationSchema), register);
router.post("/login", validateRequest(loginSchema), Login);
router.get("/verify-email", verifyEmail);

export default router;
