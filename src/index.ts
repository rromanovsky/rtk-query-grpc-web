import { BaseQueryFn } from "@reduxjs/toolkit/query/react";
import { Message } from "google-protobuf";
import { grpc } from "@improbable-eng/grpc-web";
import { MethodDefinition } from "@improbable-eng/grpc-web/dist/typings/service";
const { invoke } = grpc;

export interface GrpcArgs {
  method: MethodDefinition<Message, Message>
  request: Message
}

export type GrpcBaseQueryArgs = {
  host: string
}

/**
 * This is a very small wrapper around grpc-web that aims to simplify requests.
 * {@link [grpc-web](https://github.com/improbable-eng/grpc-web)}.
 * 
 * @example
 * ```ts
 * const baseQuery = fetchBaseQuery({
 *   host: 'https://api.your-really-great-app.com/v1/',
 * })
 * ```
 *
 * @param {string} host
 * The host for an grpc-web proxy.
 * Typically in the format of http://example.com/
 *
 */
export function grpcBaseQuery({
  host
}: GrpcBaseQueryArgs): BaseQueryFn<
  GrpcArgs
> {
  if (typeof invoke === 'undefined' || typeof host === 'undefined') {
    console.warn(
      'Warning: `grpc invoke` is not available. Please supply a custom `fetchFn` property to use `fetchBaseQuery` on SSR environments.'
    )
  }
  return async ({ method, request }) => {
    let response = await new Promise((resolve, reject) => {
      const messages: any[] = [];

      invoke(method, {
        request,
        host,
        onMessage: (message: Message) => {
          method.responseStream ? messages.push(message) : resolve(message);
        },
        onEnd: (code: grpc.Code, msg: string | undefined, trailers: grpc.Metadata) => {
          if (code == grpc.Code.OK) {
            resolve(messages);
          } else {
            reject({ code, msg });
          }
        }
      });
    }).catch((error) => {
      throw error;
    });

    return {
      data: response,
    };
  }
}
