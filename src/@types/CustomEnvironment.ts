export default interface CustomEnvironment {
  ENVIRONMENT: "development" | "staging" | "production";

  SSL_KEY: string;
  SSL_CERT: string;

  HTTP_PORT: number;
  HTTPS_PORT: number;
}
