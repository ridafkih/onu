import express from "express";
import http from "http";
import https from "https";

import AppRoute from "@/@types/AppRoute";

import * as routes from "@/routes";
import globalMiddleware from "@/middlewares/global";

import { getEnvironmentVariables } from "@/utils/env";
import AppMiddleware from "@/@types/AppMiddleware";

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

/**
 * Registers a middleware.
 * @param middleware The request handler to register as a middleware.
 * @returns The express server.
 */
export const registerMiddleware = (middleware: AppMiddleware) =>
  app.use(middleware);

/**
 * Registers an endpoint using the custom app route.
 * @param route The route to register to the app server.
 * @returns The express server.
 */
export const registerEndpoint = ({ method, handler, path }: AppRoute) =>
  app[method](path, handler);

middleware.map(registerMiddleware);
endpoints.map(registerEndpoint);
