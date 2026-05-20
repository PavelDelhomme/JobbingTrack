import { FRONTEND_URLS } from "@/config/ports.config";
import { mergeCustomizationSettings } from "./customization";

export async function fetchRemoteCustomization(): Promise<
  Record<string, unknown> | null
> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return null;

  try {
    const response = await fetch(
      `${FRONTEND_URLS.api}/api/v1/users/customization`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(4000),
      },
    );
    if (!response.ok) return null;
    const body = await response.json();
    const payload =
      body?.success && body?.customization
        ? body.customization
        : body?.data ?? body;
    if (payload && typeof payload === "object") {
      return payload as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveRemoteCustomization(
  settings: Record<string, unknown>,
): Promise<boolean> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return false;

  try {
    const response = await fetch(
      `${FRONTEND_URLS.api}/api/v1/users/customization`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
        signal: AbortSignal.timeout(4000),
      },
    );
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

export function mergeRemoteCustomization(
  base: ReturnType<typeof mergeCustomizationSettings>,
  remote: Record<string, unknown> | null,
) {
  if (!remote) return base;
  return mergeCustomizationSettings({ ...base, ...remote });
}
