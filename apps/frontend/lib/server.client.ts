import type { ApiTranslationLocale } from "@/lib/api-locale"
import type {
  BlogPostDetail,
  BlogPostListItem,
  BlogPostsListMeta,
  Event,
  EventsListMeta,
} from "@/types/api"
import axios, { type AxiosInstance } from "axios"
import "server-only"

type EventsListPayload = {
  items: Event[]
  total?: number
  page?: number
  limit?: number
  stats?: {
    communes?: number
    free?: number
  }
}

type BlogPostsListPayload = {
  items: BlogPostListItem[]
  total?: number
  page?: number
  limit?: number
}

type ApiEnvelope<T> = {
  success: boolean
  message: string
  status: number
  data: T
}

export type GetEventsResult = {
  data: Event[]
  meta: EventsListMeta
}

export type GetBlogPostsResult = {
  data: BlogPostListItem[]
  meta: BlogPostsListMeta
}

function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    "message" in value &&
    "status" in value &&
    "data" in value
  )
}

function isEventsListPayload(value: unknown): value is EventsListPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "items" in value &&
    Array.isArray((value as { items?: unknown }).items)
  )
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  )
}

function eventFromApiEnvelope(data: unknown): Event | null {
  if (!isApiEnvelope(data) || !data.success) {
    return null
  }
  const payload = data.data
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("id" in payload) ||
    typeof (payload as { id?: unknown }).id !== "string"
  ) {
    return null
  }
  return payload as Event
}

function isBlogPostsListPayload(value: unknown): value is BlogPostsListPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "items" in value &&
    Array.isArray((value as { items?: unknown }).items)
  )
}

function normalizeBlogPostsResponse(data: unknown): GetBlogPostsResult {
  if (isApiEnvelope(data) && isBlogPostsListPayload(data.data)) {
    const { items, total, page, limit } = data.data
    return {
      data: items,
      meta: {
        total: total ?? items.length,
        page: page ?? 1,
        limit: limit ?? items.length,
      },
    }
  }

  console.error(
    "[ServerClient] getBlogPosts: Unexpected response shape:",
    JSON.stringify(data)
  )

  return {
    data: [],
    meta: { total: 0, page: 1, limit: 0 },
  }
}

function normalizeEventsResponse(data: unknown): GetEventsResult {
  if (Array.isArray(data)) {
    const items = data as Event[]
    return {
      data: items,
      meta: {
        total: items.length,
        page: 1,
        limit: items.length,
        stats: {
          communes: new Set(
            items.map((event) => (event.commune || event.city || "").trim())
          ).size,
          free: items.filter((event) => event.isFree).length,
        },
      },
    }
  }

  if (isApiEnvelope(data)) {
    if (Array.isArray(data.data)) {
      const items = data.data as Event[]
      return {
        data: items,
        meta: {
          total: items.length,
          page: 1,
          limit: items.length,
          stats: {
            communes: new Set(
              items.map((event) => (event.commune || event.city || "").trim())
            ).size,
            free: items.filter((event) => event.isFree).length,
          },
        },
      }
    }

    if (isEventsListPayload(data.data)) {
      const { items, total, page, limit, stats } = data.data
      return {
        data: items,
        meta: {
          total: total ?? items.length,
          page: page ?? 1,
          limit: limit ?? items.length,
          stats: {
            communes:
              stats?.communes ??
              new Set(
                items.map((event) => (event.commune || event.city || "").trim())
              ).size,
            free: stats?.free ?? items.filter((event) => event.isFree).length,
          },
        },
      }
    }
  }

  console.error(
    "[ServerClient] getEvents: Unexpected response shape for events:",
    JSON.stringify(data)
  )

  return {
    data: [],
    meta: {
      total: 0,
      page: 1,
      limit: 0,
      stats: {
        communes: 0,
        free: 0,
      },
    },
  }
}

const axiosInstance = axios.create({
  baseURL: process.env.API_BASE_URL,
})

class ServerClient {
  private axios: AxiosInstance

  constructor() {
    this.axios = axiosInstance
  }

  /**
   * Lista eventos. Por defecto pide hasta 100 ítems para el hero (máx. API: 100).
   */
  async getEvents(params?: {
    page?: number
    limit?: number
    status?: Event["status"]
    categoryPrimary?: Event["categoryPrimary"]
    commune?: string
    city?: string
    region?: string
    source?: string
    locale?: ApiTranslationLocale
  }): Promise<GetEventsResult> {
    try {
      const page = params?.page ?? 1
      const limit = params?.limit ?? 100
      const {
        status,
        categoryPrimary,
        commune,
        city,
        region,
        source,
        locale,
      } = params ?? {}
      const response = await this.axios.get<unknown>("/api/v1/events", {
        params: {
          page,
          limit,
          status,
          categoryPrimary,
          commune,
          city,
          region,
          source,
          locale,
        },
      })
      return normalizeEventsResponse(response.data)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "[ServerClient] Axios error when fetching events:",
          error.response?.status,
          error.response?.data || error.message
        )
        throw new Error(
          `Failed to fetch events: ${error.response?.status ?? ""} ${
            typeof error.response?.data === "string" ? error.response.data : ""
          }`
        )
      }

      console.error("[ServerClient] Unknown error when fetching events:", error)
      throw new Error("An unexpected error occurred while fetching events.")
    }
  }

  async getCurrentWeekEvents(params?: {
    page?: number
    limit?: number
    status?: Event["status"]
    locale?: ApiTranslationLocale
  }): Promise<GetEventsResult> {
    try {
      const page = params?.page ?? 1
      const limit = params?.limit ?? 100
      const { status, locale } = params ?? {}
      const response = await this.axios.get<unknown>(
        "/api/v1/events/current-week",
        {
          params: { page, limit, status, locale },
        }
      )
      return normalizeEventsResponse(response.data)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "[ServerClient] Axios error when fetching current week events:",
          error.response?.status,
          error.response?.data || error.message
        )
        throw new Error(
          `Failed to fetch current week events: ${error.response?.status ?? ""} ${
            typeof error.response?.data === "string" ? error.response.data : ""
          }`
        )
      }

      console.error(
        "[ServerClient] Unknown error when fetching current week events:",
        error
      )
      throw new Error(
        "An unexpected error occurred while fetching current week events."
      )
    }
  }

  async getEventById(
    id: string,
    params?: { locale?: ApiTranslationLocale }
  ): Promise<Event | null> {
    try {
      const locale = params?.locale
      const response = await this.axios.get<unknown>(
        `/api/v1/events/${encodeURIComponent(id)}`,
        { params: { locale } }
      )
      return eventFromApiEnvelope(response.data)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null
      }
      if (axios.isAxiosError(error)) {
        console.error(
          "[ServerClient] Axios error when fetching event by id:",
          error.response?.status,
          error.response?.data || error.message
        )
      } else {
        console.error(
          "[ServerClient] Unknown error when fetching event by id:",
          error
        )
      }
      return null
    }
  }

  async getEventBySlug(
    slug: string,
    params?: { locale?: ApiTranslationLocale }
  ): Promise<Event | null> {
    try {
      const locale = params?.locale
      const response = await this.axios.get<unknown>(
        `/api/v1/events/slug/${encodeURIComponent(slug)}`,
        { params: { locale } }
      )
      return eventFromApiEnvelope(response.data)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null
      }
      if (axios.isAxiosError(error)) {
        console.error(
          "[ServerClient] Axios error when fetching event by slug:",
          error.response?.status,
          error.response?.data || error.message
        )
      } else {
        console.error(
          "[ServerClient] Unknown error when fetching event by slug:",
          error
        )
      }
      return null
    }
  }

  /**
   * Resolves UUID (legacy links) or slug (public URLs) to a single event.
   */
  async getEventForPublicPage(
    slugOrId: string,
    params?: { locale?: ApiTranslationLocale }
  ): Promise<Event | null> {
    if (isUuid(slugOrId)) {
      return this.getEventById(slugOrId, params)
    }
    return this.getEventBySlug(slugOrId, params)
  }

  async getBlogPosts(params?: {
    page?: number
    limit?: number
    locale?: ApiTranslationLocale
  }): Promise<GetBlogPostsResult> {
    try {
      const page = params?.page ?? 1
      const limit = params?.limit ?? 12
      const locale = params?.locale
      const response = await this.axios.get<unknown>("/api/v1/blog/posts", {
        params: { page, limit, locale },
      })
      return normalizeBlogPostsResponse(response.data)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "[ServerClient] Axios error when fetching blog posts:",
          error.response?.status,
          error.response?.data || error.message
        )
      } else {
        console.error(
          "[ServerClient] Unknown error when fetching blog posts:",
          error
        )
      }
      return {
        data: [],
        meta: { total: 0, page: 1, limit: params?.limit ?? 12 },
      }
    }
  }

  async getBlogPostBySlug(
    slug: string,
    params?: { locale?: ApiTranslationLocale }
  ): Promise<BlogPostDetail | null> {
    try {
      const locale = params?.locale
      const response = await this.axios.get<unknown>(
        `/api/v1/blog/posts/${encodeURIComponent(slug)}`,
        { params: { locale } }
      )
      if (!isApiEnvelope(response.data) || !response.data.success) {
        return null
      }
      const payload = response.data.data
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("slug" in payload) ||
        typeof (payload as { slug?: unknown }).slug !== "string"
      ) {
        return null
      }
      return payload as BlogPostDetail
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null
      }
      if (axios.isAxiosError(error)) {
        console.error(
          "[ServerClient] Axios error when fetching blog post:",
          error.response?.status,
          error.response?.data || error.message
        )
      } else {
        console.error(
          "[ServerClient] Unknown error when fetching blog post:",
          error
        )
      }
      return null
    }
  }
}

const serverClient = new ServerClient()

export default serverClient
