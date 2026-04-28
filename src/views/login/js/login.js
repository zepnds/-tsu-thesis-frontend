// frontend/src/views/login/js/login.js
import { setAuth } from "../../../utils/auth";

function routeForRole(role) {
  switch (String(role || "").toLowerCase()) {
    case "super_admin":
      return "/superadmin/setup";
    case "admin":
      return "/admin/plots";
    case "staff":
      return "/staff/dashboard/";
    default:
      return "/visitor/home";
  }
}

function cleanBase(base) {
  return String(base || "").replace(/\/+$/, "");
}

async function safeRead(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  try {
    return await res.text();
  } catch {
    return null;
  }
}

export async function postLogin({ usernameOrEmail, password, setError }) {
  const BASE = cleanBase(import.meta.env.VITE_API_BASE_URL);
  if (!BASE) throw new Error("Missing VITE_API_BASE_URL in frontend/.env");

  console.log("API BASE:", BASE);

  // ✅ your current endpoint
  const url = `${BASE}/auth/login`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ usernameOrEmail, password }),
    });

    const data = await safeRead(res);

    if (!res.ok || data?.status === 'error') {
      const msg =
        (data && typeof data === "object" && (data.message || data.error)) ||
        (typeof data === "string" && data) ||
        `Login failed (${res.status})`;

      if (data?.errorCode === 'INVALID_CREDENTIALS' && setError) {
        setError(prev => ({ ...prev, usernameOrEmail: data.message }));
      }

      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    // Handle ApiResponse wrapper
    const payload = (data?.status === 'success' && data?.data) ? data.data : data;

    const token = payload?.token || null;
    const user = payload?.user || null;

    if (token && user) {
      setAuth({ token, user });
    }

    return { token, user, next: routeForRole(user?.role) };
  } catch (err) {
    throw err;
  }
}
