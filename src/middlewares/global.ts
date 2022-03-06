import path from "path";
import express, { Request, Response } from "express";

import AppMiddleware from "@/@types/AppMiddleware";
import { getEnvironmentVariables } from "@/utils/env";

const { ENVIRONMENT } = getEnvironmentVariables();

export default [
  express.static(path.join(__dirname, "src", "public")),
  (request, response, next) => {
    if (request.secure || ENVIRONMENT !== "production") return next();
    response.redirect(`https://${request.headers.host}${request.url}`);
  },
] as AppMiddleware[];
