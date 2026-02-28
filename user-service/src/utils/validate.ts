import Joi from "joi";
import jwt from "jsonwebtoken";

export const removeFriendSchema = Joi.object({
  friendId: Joi.string().required(),
});

export interface DecodedToken {
  userId: string;
  email: string;
  iat: number;
  exp: number;
  [key: string]: any;
}

export interface TokenValidationResult {
  valid: boolean;
  decoded?: DecodedToken;
  error?: string;
}

export const validateJWTToken = (token: string, secret: string): TokenValidationResult => {
  if (!token) {
    return {
      valid: false,
      error: "Token is required",
    };
  }

  try {
    const decoded = jwt.verify(token, secret) as DecodedToken;
    return {
      valid: true,
      decoded,
    };
  } catch (error) {
    let errorMessage = "Invalid token";

    if (error instanceof jwt.TokenExpiredError) {
      errorMessage = "Token has expired";
    } else if (error instanceof jwt.JsonWebTokenError) {
      errorMessage = "Malformed or invalid token";
    } else if (error instanceof jwt.NotBeforeError) {
      errorMessage = "Token is not yet valid";
    }

    return {
      valid: false,
      error: errorMessage,
    };
  }
};

export const decodeJWTToken = (token: string): TokenValidationResult => {
  if (!token) {
    return {
      valid: false,
      error: "Token is required",
    };
  }

  try {
    const decoded = jwt.decode(token) as DecodedToken | null;
    
    if (!decoded) {
      return {
        valid: false,
        error: "Unable to decode token",
      };
    }

    return {
      valid: true,
      decoded,
    };
  } catch (error) {
    return {
      valid: false,
      error: "Malformed token - unable to decode",
    };
  }
};

export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null;
  }

  return parts[1];
};