import express from "express";
import http from "http";
import https from "https";

import AppRoute from "@/@types/AppRoute";
import AppMiddleware from "@/@types/AppMiddleware";

import * as routes from "@/routes";
import globalMiddleware from "@/middlewares/global";

import { getEnvironmentVariables } from "@/utils/env";
import { registerMiddleware, registerEndpoint } from "@/utils/server";

const middleware: AppMiddleware[] = globalMiddleware;
const endpoints: AppRoute[] = Object.values(routes);

const {
  HTTP_PORT,
  HTTPS_PORT,
  SSL_KEY: key,
  SSL_CERT: cert,
} = getEnvironmentVariables();

export const app = express();
export const servers = {
  http: http.createServer(app).listen(HTTP_PORT),
  https: https.createServer({ key, cert }, app).listen(HTTPS_PORT),
};

middleware.map(registerMiddleware);
endpoints.map(registerEndpoint);
