export default interface CustomEnvironment {
  SSL_KEY: string;
  SSL_CERT: string;

  HTTP_PORT: number;
  HTTPS_PORT: number;
}
