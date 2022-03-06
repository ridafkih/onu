import path from "path";
import { Request, Response } from "express";

import AppRoute from "@/@types/AppRoute";

export default {
  name: "index",
  method: "get",
  path: "/",
  handler: (_request: Request, response: Response) => {
    response.sendFile(path.join(__dirname, "src", "public", "index.html"));
  },
} as AppRoute;
