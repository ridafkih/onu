import { Request, Response } from "express";

import AppRoute from "@/@types/AppRoute";

export default {
  name: "index",
  method: "get",
  path: "/",
  handler: (_request: Request, response: Response<{ name: string }>) => {
    response.json({ name: "string" });
  },
} as AppRoute;
