import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    requestId?: string;
    rawBody?: Buffer;
    getRawBody(): Buffer | undefined;
    hasRawBody(): boolean;
  }
}
