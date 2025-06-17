import { Request } from "express";

export function getCookie(req: Request) {
  var cookie = req.headers.cookie;

  console.log("Cookies:", cookie);

  return cookie?.split("; ");
}
