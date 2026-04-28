// frontend/src/views/login/js/signup.js
import { setAuth } from "../../../utils/auth";

function routeForRole(role) {
  switch (String(role || "").toLowerCase()) {
    case "super_admin":
      return "/superadmin/dashboard";
    case "admin":
      return "/admin/dashboard";
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

export async function postSendOtp({ email, username, phone, setError }) {
  const BASE = cleanBase(import.meta.env.VITE_API_BASE_URL);
  if (!BASE) throw new Error("Missing VITE_API_BASE_URL in frontend/.env");

  const url = `${BASE}/auth/send-registration-otp`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email, username, phone }),
    });

    const data = await safeRead(res);
    console.log("res", JSON.stringify(data));

    if (!res.ok || data?.status === 'error') {
      const msg =
        (data && typeof data === "object" && (data.message || data.error)) ||
        (typeof data === "string" && data) ||
        `Failed to send OTP (${res.status})`;

      // If we have an errorCode, map it to a field error
      if (data?.errorCode && setError) {
        const fieldMap = {
          EMAIL_ALREADY_REGISTERED: 'email',
          USERNAME_ALREADY_TAKEN: 'username',
          PHONE_ALREADY_REGISTERED: 'phone',
          OTP_NOT_REQUESTED_OR_EXPIRED: "otp",
          INVALID_OTP: "otp",
          OTP_EXPIRED: "otp "
        };
        const field = fieldMap[data.errorCode];
        if (field) {
          setError(prev => ({ ...prev, [field]: data.message }));
        }
      }

      throw new Error(msg);
    }
    return data;
  } catch (err) {
    console.log(err);
    const msg = err?.message || String(err);
    // Don't wrap if it's already a clean error message
    throw err;
  }
}

export async function postSignup({
  username,
  email,
  password,
  first_name,
  last_name,
  phone,
  address,
  otp,
  setError
}) {
  const BASE = cleanBase(import.meta.env.VITE_API_BASE_URL);
  if (!BASE) throw new Error("Missing VITE_API_BASE_URL in frontend/.env");

  // ✅ your current endpoint
  const url = `${BASE}/auth/register`;

  try {
    const _payload = {
      username,
      email,
      password,
      first_name,
      last_name,
      phone: phone || null,
      address: address || null,
      otp,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(_payload),
    }).catch(err => {
      console.log("error", err)
      throw err
    });

    const data = await safeRead(res);

    if (!res.ok || data?.status === 'error') {
      const msg =
        (data && typeof data === "object" && (data.message || data.error)) ||
        (typeof data === "string" && data) ||
        `Failed to register (${res.status})`;

      // If we have an errorCode, map it to a field error
      if (data?.errorCode && setError) {
        const fieldMap = {
          EMAIL_ALREADY_REGISTERED: 'email',
          USERNAME_ALREADY_TAKEN: 'username',
          PHONE_ALREADY_REGISTERED: 'phone',
          OTP_NOT_REQUESTED_OR_EXPIRED: "otp",
          INVALID_OTP: "otp",
          OTP_EXPIRED: "otp "
        };
        const field = fieldMap[data.errorCode];
        if (field) {
          setError(prev => ({ ...prev, [field]: data.message }));
        }
      }

      throw new Error(msg);
    }



    const user = data?.data || (data && typeof data === "object" ? data : null);
    const token = data?.token || data?.data?.token || null;

    if (token && user) {
      setAuth({ token, user });
    }

    const next = (token && user) ? routeForRole(user.role) : "/visitor/home";
    return { token, user, next };

  } catch (err) {
    // Network/CORS shows as "Failed to fetch"
    const msg = err?.message || String(err);
    console.log("msg", msg)
    console.log("err", err)
    const e = new Error(
      `Signup request failed.\nURL: ${url}\nReason: ${msg}`
    );
    e.cause = err;
    throw e;
  }
}
