import AppMiddleware from "@/@types/AppMiddleware";
import AppRoute from "@/@types/AppRoute";

import { app } from "@/modules/app";

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
