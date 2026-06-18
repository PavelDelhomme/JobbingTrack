import axios from "axios";
import { FRONTEND_URLS } from "@/config/ports.config";
import type { AnalyticsUserListItem } from "./userPicker";

export interface FetchAnalyticsUsersParams {
  token: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface FetchAnalyticsUsersResult {
  users: AnalyticsUserListItem[];
  total: number;
  limit: number;
  offset: number;
  pages: number;
}

export async function fetchAnalyticsUsers(
  params: FetchAnalyticsUsersParams,
): Promise<FetchAnalyticsUsersResult> {
  const { token, search = "", limit = 50, offset = 0 } = params;
  const res = await axios.get(`${FRONTEND_URLS.api}/api/v1/auth/users`, {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      limit,
      offset,
      ...(search.trim() ? { search: search.trim() } : {}),
    },
  });

  const list = res.data?.users ?? res.data?.data?.users ?? [];
  const pagination = res.data?.pagination ?? {};
  const total =
    typeof pagination.total === "number"
      ? pagination.total
      : typeof res.data?.total === "number"
        ? res.data.total
        : Array.isArray(list)
          ? list.length
          : 0;

  return {
    users: Array.isArray(list) ? list : [],
    total,
    limit: pagination.limit ?? limit,
    offset: pagination.offset ?? offset,
    pages: pagination.pages ?? Math.max(1, Math.ceil(total / limit)),
  };
}
