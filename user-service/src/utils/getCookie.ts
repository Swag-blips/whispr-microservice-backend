import { Request } from "express";

export function getCookie(req: Request) {
  var cookie = req.headers.cookie;


  console.log("request headers", req.headers)
  console.log("Cookies:", cookie);

  return cookie?.split("; ");
}
