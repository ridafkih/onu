export default interface CustomEnvironment {
  SERVER_PORT: number | undefined;

  SSL_KEY: string;
  SSL_CERT: string;

  HTTP_PORT: number;
  HTTPS_PORT: number;
}
