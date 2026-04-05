import { HTTPException } from "hono/http-exception";
import { flattenError, ZodError } from "zod";
import { Prisma } from "../generated/prisma/client.js";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
type JsonArray = JsonValue[];
type JsonObject = { [key: string]: JsonValue };

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "HEAD";

export type SuccessResponse<T extends JsonValue = JsonValue> = {
  success: true;
  message: string;
  status: number;
  data: T;
};

export type ErrorResponse = {
  success: false;
  message: string;
  status: number;
  error?: string;
  details?: JsonValue;
  allowedMethods?: HttpMethod[];
};

export type ApiResponse<T extends JsonValue = JsonValue> =
  | SuccessResponse<T>
  | ErrorResponse;

class ResponseEnhancer {
  private toSerializable(
    value: unknown,
    seen: WeakSet<object> = new WeakSet(),
  ): JsonValue {
    if (value === null || value === undefined) {
      return null;
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }

    if (typeof value === "bigint") {
      return value.toString();
    }

    if (typeof value === "symbol") {
      return value.toString();
    }

    if (typeof value === "function") {
      return `[Function: ${value.name || "anonymous"}]`;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value instanceof Set) {
      return Array.from(value, (item) => this.toSerializable(item, seen));
    }

    if (value instanceof Map) {
      const obj: JsonObject = {};

      for (const [key, mapValue] of value.entries()) {
        obj[String(key)] = this.toSerializable(mapValue, seen);
      }

      return obj;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.toSerializable(item, seen)) as JsonArray;
    }

    if (typeof value === "object") {
      if (seen.has(value as object)) {
        return "[Circular]";
      }

      seen.add(value as object);

      const obj: JsonObject = {};

      for (const [key, nestedValue] of Object.entries(
        value as Record<string, unknown>,
      )) {
        obj[key] = this.toSerializable(nestedValue, seen);
      }

      return obj;
    }

    return String(value);
  }

  private serializeData(data: unknown): JsonValue {
    return this.toSerializable(data);
  }

  private successResponse(
    status: number,
    message: string,
    data: unknown = null,
  ): SuccessResponse {
    return {
      success: true,
      message,
      status,
      data: this.serializeData(data),
    };
  }

  private errorResponse(
    status: number,
    message: string,
    error?: string,
    details?: unknown,
    allowedMethods?: HttpMethod[],
  ): ErrorResponse {
    const response: ErrorResponse = {
      success: false,
      message,
      status,
    };

    if (error !== undefined) {
      response.error = error;
    }

    if (details !== undefined) {
      response.details = this.toSerializable(details);
    }

    if (allowedMethods !== undefined) {
      response.allowedMethods = allowedMethods;
    }

    return response;
  }

  public ok(data: unknown = null, message: string = "OK"): SuccessResponse {
    return this.successResponse(200, message, data);
  }

  public created(
    data: unknown = null,
    message: string = "Created",
  ): SuccessResponse {
    return this.successResponse(201, message, data);
  }

  public accepted(
    data: unknown = null,
    message: string = "Accepted",
  ): SuccessResponse {
    return this.successResponse(202, message, data);
  }

  /**
   * Maps thrown values (Prisma, Hono HTTPException, Error, or unknown) to a consistent API error shape.
   * Use with Hono `app.onError` and optional `c.json(body, body.status)`.
   */
  public errorHandler(
    error: unknown,
    fallbackMessage: string = "Internal Server Error",
  ): ErrorResponse {
    if (error instanceof HTTPException) {
      const status = error.status;
      const message = error.message || "Error";
      if (status >= 400 && status < 600) {
        const mapped = this.fromStatus(status, undefined, message);
        if (this.isError(mapped)) {
          return mapped;
        }
      }
      const resolvedStatus = status >= 400 ? status : 500;
      return this.errorResponse(resolvedStatus, message, "HTTP_EXCEPTION");
    }

    if (error instanceof ZodError) {
      return this.badRequest("Validation failed", {
        code: "ZOD_VALIDATION",
        ...flattenError(error),
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return this.mapPrismaKnownRequestError(error);
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return this.badRequest("Invalid request data", {
        code: "VALIDATION_ERROR",
        message: error.message,
      });
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return this.serviceUnavailable("Database connection failed", {
        code: error.errorCode,
        message: error.message,
      });
    }

    if (
      error instanceof Prisma.PrismaClientUnknownRequestError ||
      error instanceof Prisma.PrismaClientRustPanicError
    ) {
      return this.internalError("Database error", {
        code: "PRISMA_UNKNOWN",
        message: error.message,
      });
    }

    if (error instanceof Error) {
      return this.internalError(fallbackMessage, {
        name: error.name,
        message: error.message,
      });
    }

    return this.internalError(fallbackMessage, {
      message: String(error),
    });
  }

  private mapPrismaKnownRequestError(
    err: Prisma.PrismaClientKnownRequestError,
  ): ErrorResponse {
    const meta = err.meta as Record<string, unknown> | undefined;
    const details = { code: err.code, ...(meta ? { meta } : {}) };

    switch (err.code) {
      case "P2002":
        return this.conflict(
          "A record with this value already exists.",
          details,
        );
      case "P2025":
      case "P2018":
      case "P2015":
      case "P2001":
        return this.notFound("The requested record was not found.", details);
      case "P2003":
        return this.badRequest("Related record constraint failed.", details);
      case "P2011":
      case "P2012":
      case "P2013":
      case "P2014":
      case "P2017":
      case "P2019":
      case "P2020":
        return this.badRequest(err.message, details);
      case "P2024":
        return this.serviceUnavailable("Database request timed out.", details);
      case "P1001":
      case "P1002":
      case "P1003":
      case "P1017":
        return this.serviceUnavailable("Database is unavailable.", details);
      case "P2021":
      case "P2022":
      case "P2023":
        return this.internalError("Database schema error.", details);
      default:
        return this.internalError("Database error.", {
          ...details,
          message: err.message,
        });
    }
  }

  public noContent(message: string = "No Content"): SuccessResponse<null> {
    return {
      success: true,
      message,
      status: 204,
      data: null,
    };
  }

  public badRequest(
    message: string = "Bad Request",
    details?: unknown,
  ): ErrorResponse {
    return this.errorResponse(400, message, "BAD_REQUEST", details);
  }

  public unauthorized(
    message: string = "Unauthorized",
    details?: unknown,
  ): ErrorResponse {
    return this.errorResponse(401, message, "UNAUTHORIZED", details);
  }

  public forbidden(
    message: string = "Forbidden",
    details?: unknown,
  ): ErrorResponse {
    return this.errorResponse(403, message, "FORBIDDEN", details);
  }

  public notFound(
    message: string = "Not Found",
    details?: unknown,
  ): ErrorResponse {
    return this.errorResponse(404, message, "NOT_FOUND", details);
  }

  public methodNotAllowed(
    allowedMethods: HttpMethod[],
    message: string = "Method Not Allowed",
    details?: unknown,
  ): ErrorResponse {
    return this.errorResponse(
      405,
      message,
      "METHOD_NOT_ALLOWED",
      details,
      allowedMethods,
    );
  }

  public conflict(
    message: string = "Conflict",
    details?: unknown,
  ): ErrorResponse {
    return this.errorResponse(409, message, "CONFLICT", details);
  }

  public unprocessableEntity(
    message: string = "Unprocessable Entity",
    details?: unknown,
  ): ErrorResponse {
    return this.errorResponse(422, message, "UNPROCESSABLE_ENTITY", details);
  }

  public tooManyRequests(
    message: string = "Too Many Requests",
    details?: unknown,
  ): ErrorResponse {
    return this.errorResponse(429, message, "TOO_MANY_REQUESTS", details);
  }

  public internalError(
    message: string = "Internal Server Error",
    details?: unknown,
  ): ErrorResponse {
    return this.errorResponse(500, message, "INTERNAL_SERVER_ERROR", details);
  }

  public notImplemented(
    message: string = "Not Implemented",
    details?: unknown,
  ): ErrorResponse {
    return this.errorResponse(501, message, "NOT_IMPLEMENTED", details);
  }

  public serviceUnavailable(
    message: string = "Service Unavailable",
    details?: unknown,
  ): ErrorResponse {
    return this.errorResponse(503, message, "SERVICE_UNAVAILABLE", details);
  }

  public fromStatus(
    status: number,
    dataOrDetails?: unknown,
    message?: string,
  ): ApiResponse {
    switch (status) {
      case 200:
        return this.ok(dataOrDetails, message ?? "OK");
      case 201:
        return this.created(dataOrDetails, message ?? "Created");
      case 202:
        return this.accepted(dataOrDetails, message ?? "Accepted");
      case 204:
        return this.noContent(message ?? "No Content");
      case 400:
        return this.badRequest(message ?? "Bad Request", dataOrDetails);
      case 401:
        return this.unauthorized(message ?? "Unauthorized", dataOrDetails);
      case 403:
        return this.forbidden(message ?? "Forbidden", dataOrDetails);
      case 404:
        return this.notFound(message ?? "Not Found", dataOrDetails);
      case 409:
        return this.conflict(message ?? "Conflict", dataOrDetails);
      case 422:
        return this.unprocessableEntity(
          message ?? "Unprocessable Entity",
          dataOrDetails,
        );
      case 429:
        return this.tooManyRequests(
          message ?? "Too Many Requests",
          dataOrDetails,
        );
      case 500:
        return this.internalError(
          message ?? "Internal Server Error",
          dataOrDetails,
        );
      case 501:
        return this.notImplemented(message ?? "Not Implemented", dataOrDetails);
      case 503:
        return this.serviceUnavailable(
          message ?? "Service Unavailable",
          dataOrDetails,
        );
      default:
        if (status >= 200 && status < 300) {
          return this.successResponse(
            status,
            message ?? "Success",
            dataOrDetails,
          );
        }

        return this.errorResponse(
          status,
          message ?? "Error",
          "HTTP_ERROR",
          dataOrDetails,
        );
    }
  }

  public forMethod(
    method: HttpMethod,
    data?: unknown,
  ): SuccessResponse | ErrorResponse {
    switch (method) {
      case "GET":
        return this.ok(data, "Fetched successfully");
      case "POST":
        return this.created(data, "Created successfully");
      case "PUT":
        return this.ok(data, "Updated successfully");
      case "PATCH":
        return this.ok(data, "Patched successfully");
      case "DELETE":
        return this.ok(data ?? null, "Deleted successfully");
      case "OPTIONS":
        return this.ok(data ?? null, "Options retrieved successfully");
      case "HEAD":
        return this.noContent("Head request successful");
      default:
        return this.internalError("Unsupported HTTP method");
    }
  }

  public isSuccess<T extends JsonValue>(
    response: ApiResponse<T>,
  ): response is SuccessResponse<T> {
    return response.success;
  }

  public isError<T extends JsonValue>(
    response: ApiResponse<T>,
  ): response is ErrorResponse {
    return !response.success;
  }
}

const responseEnhancer = new ResponseEnhancer();

export default responseEnhancer;
