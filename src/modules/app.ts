import express from "express";
import http from "http";
import https from "https";

import AppRoute from "@/@types/AppRoute";

import * as routes from "@/routes";
import { getEnvironmentVariables } from "@/utils/env";

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

export const registerEndpoint = ({ method, handler, path }: AppRoute) =>
  app[method](path, handler);

endpoints.map(registerEndpoint);
