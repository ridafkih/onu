import { config } from "dotenv";

import CustomEnvironment from "@/@types/CustomEnvironment";

const { env } = process;

/**
 * Gets the environment variables for the project.
 * @returns The environment variables.
 */
export const getEnvironmentVariables = () =>
  env as typeof env & CustomEnvironment;

config();
