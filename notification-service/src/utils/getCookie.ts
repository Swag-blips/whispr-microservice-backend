import { Request } from "express";

export function getCookie(req: Request) {
  var cookie = req.headers.cookie;


  return cookie?.split("; ");
}
