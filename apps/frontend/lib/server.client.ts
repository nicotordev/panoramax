import "server-only";
import axios, { type AxiosInstance } from "axios";
import type { Event } from "@/types/api";

type EventsListPayload = {
  items: Event[];
  total?: number;
  page?: number;
  limit?: number;
};

type EventsSuccessResponse = {
  success: true;
  message: string;
  status: number;
  data: Event[];
  meta?: Omit<EventsListPayload, "items">;
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  status: number;
  data: T;
};

function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    "message" in value &&
    "status" in value &&
    "data" in value
  );
}

function isEventsListPayload(value: unknown): value is EventsListPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "items" in value &&
    Array.isArray((value as { items?: unknown }).items)
  );
}

function normalizeEventsResponse(data: unknown): EventsSuccessResponse {
  if (Array.isArray(data)) {
    return {
      success: true,
      message: "Events fetched successfully",
      status: 200,
      data: data as Event[],
    };
  }

  if (isApiEnvelope(data)) {
    if (Array.isArray(data.data)) {
      return {
        success: true,
        message: data.message,
        status: data.status,
        data: data.data as Event[],
      };
    }

    if (isEventsListPayload(data.data)) {
      const { items, ...meta } = data.data;
      return {
        success: true,
        message: data.message,
        status: data.status,
        data: items,
        meta,
      };
    }
  }

  console.error(
    "[ServerClient] getEvents: Unexpected response shape for events:",
    JSON.stringify(data)
  );

  return {
    success: true,
    message: "Events fetched successfully",
    status: 200,
    data: [],
  };
}

const axiosInstance = axios.create({
  baseURL: process.env.API_BASE_URL,
});

class ServerClient {
  private axios: AxiosInstance;

  constructor() {
    this.axios = axiosInstance;
  }

  async getEvents(): Promise<EventsSuccessResponse> {
    try {
      const response = await this.axios.get<unknown>("/v1/events");
      return normalizeEventsResponse(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "[ServerClient] Axios error when fetching events:",
          error.response?.status,
          error.response?.data || error.message
        );
        throw new Error(
          `Failed to fetch events: ${error.response?.status ?? ""} ${
            typeof error.response?.data === "string" ? error.response.data : ""
          }`
        );
      }

      console.error("[ServerClient] Unknown error when fetching events:", error);
      throw new Error("An unexpected error occurred while fetching events.");
    }
  }
}

const serverClient = new ServerClient();

export default serverClient;
