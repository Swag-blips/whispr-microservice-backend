import { Router } from "express";
import { register } from "../controllers/auth.controller";
import { registrationSchema } from "../utils/validate";
import validateRequest from "../middleware/validateRequest";

const router = Router();

router.post("/register", validateRequest(registrationSchema), register);

export default router;
