import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";
import { getSession } from "next-auth/react";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

function getSafeExpiry(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return undefined;
  if (d.getTime() <= Date.now()) return undefined;
  return d;
}

async function getAuthToken(): Promise<string | null> {
  if (typeof window !== "undefined") {
    try {
      const session = await getSession();
      if (session?.accessToken) {
        return session.accessToken;
      }
    } catch (error) {
      console.log("[api] Error getting session:", error);
    }
  }
  
  const cookieToken = Cookies.get("access_token");
  if (cookieToken) {
    return cookieToken;
  }
  
  return null;
}

if (typeof window !== "undefined") {
  console.log("[api] baseURL =", api.defaults.baseURL);
}

api.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const url = (error?.config?.baseURL ?? "") + (error?.config?.url ?? "");

    if (error?.response?.status === 401 && !originalRequest._retry) {
      if (url.includes("/auth/login") || url.includes("/auth/refresh")) {
        return Promise.reject(error);
      }

      const refreshToken = Cookies.get("refresh_token");

      if (!refreshToken) {
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post("/auth/refresh", {
          refresh_token: refreshToken,
        });

        if (data?.status && data?.data?.token) {
          const newAccessToken: string = data.data.token;
          const safeExpiry = getSafeExpiry(data.data.expires_at);

          const cookieOptions: Cookies.CookieAttributes = {
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
          };

          if (safeExpiry) {
            cookieOptions.expires = safeExpiry;
          }

          Cookies.set("access_token", newAccessToken, cookieOptions);

          if (data.data.refresh_token) {
            Cookies.set("refresh_token", data.data.refresh_token, {
              expires: 7,
              secure: process.env.NODE_ENV === "production",
              sameSite: "strict",
              path: "/",
            });
          }

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          processQueue(null, newAccessToken);
          isRefreshing = false;

          return api(originalRequest);
        } else {
          throw new Error("Invalid refresh response structure");
        }
      } catch (refreshError: any) {
        // Handle throttling errors (429) - don't clear auth, just reject
        if (refreshError?.response?.status === 429) {
          console.warn("Token refresh rate limited, will retry later");
          processQueue(refreshError, null);
          isRefreshing = false;
          // Don't clear auth on throttling - just reject the request
          return Promise.reject(refreshError);
        }
        // For other errors, clear auth and redirect
        processQueue(refreshError, null);
        isRefreshing = false;
        clearAuthAndRedirect();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

function clearAuthAndRedirect() {
  try {
    Cookies.remove("access_token", { path: "/" });
    Cookies.remove("refresh_token", { path: "/" });
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      localStorage.removeItem("permissions");
      window.location.href = "/login";
    }
  } catch (e) {
    console.error("[api] failed to clear auth:", e);
  }
}

export default api;
