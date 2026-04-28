// frontend/src/views/login/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { postLogin } from "./js/login";
import { postSignup, postSendOtp } from "./js/signup";


// shadcn/ui
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { Alert, AlertDescription } from "../../components/ui/alert";

export default function Login() {
  const nav = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // form state
  const [formData, setFormData] = useState({
    usernameOrEmail: "",
    password: "",
    username: "",
    email: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
  });

  // OTP state
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState({})
  const onChange = (e) => {
    setMsg({ type: "", text: "" });
    setError((prev) => ({ ...prev, [e.target.name]: "" }));
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const toggleForm = () => {
    setIsLogin((v) => !v);
    setMsg({ type: "", text: "" });
    setError({});
    setFormData({
      usernameOrEmail: "",
      password: "",
      username: "",
      email: "",
      confirmPassword: "",
      first_name: "",
      last_name: "",
      phone: "",
      address: "",
    });
  };

  async function sendOtpEmail(toEmail, toUsername) {
    setSendingOtp(true);
    setMsg({ type: "", text: "" });
    try {
      await postSendOtp({ email: toEmail, username: toUsername, phone: formData.phone.trim(), setError });

      setOtpInput("");
      setOtpDialogOpen(true);
      setMsg({
        type: "ok",
        text: "We sent a 6-digit code to your email. Enter it below to continue.",
      });
    } catch (err) {
      console.log("error", err)
      setMsg({
        type: "error",
        text:
          err?.message ||
          "Could not send verification email. Please try again.",
      });
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    try {
      setLoading(true);

      if (isLogin) {
        if (!formData.usernameOrEmail || !formData.password) {
          setMsg({
            type: "error",
            text: "Please enter email/username and password.",
          });
          return;
        }
        const { next } = await postLogin({
          usernameOrEmail: formData.usernameOrEmail.trim(),
          password: formData.password,
          setError
        });
        nav(next);
      } else {
        if (
          !formData.username ||
          !formData.email ||
          !formData.password ||
          !formData.first_name ||
          !formData.last_name
        ) {
          setMsg({ type: "error", text: "Please complete all required fields." });
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setMsg({ type: "error", text: "Passwords do not match." });
          return;
        }

        await sendOtpEmail(formData.email.trim(), formData.username.trim());
      }
    } catch (err) {
      setMsg({ type: "error", text: err?.message || "Something went wrong." });
    } finally {
      setLoading(false);
    }
  }

  async function verifyAndCreate() {
    if (!otpInput.trim()) {
      setMsg({ type: "error", text: "Please enter the OTP." });
      return;
    }

    try {
      setLoading(true);
      const { token, next } = await postSignup({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        otp: otpInput.trim(),
        setError
      });

      if (token) {
        nav(next);
      } else {
        setMsg({ type: "ok", text: "Account created successfully! Please sign in with your credentials." });
        setIsLogin(true);
        setError({});
        setFormData({
          usernameOrEmail: formData.email,
          password: "",
          username: "",
          email: "",
          confirmPassword: "",
          first_name: "",
          last_name: "",
          phone: "",
          address: "",
        });
      }
      setOtpDialogOpen(false);
    } catch (err) {
      console.log("error", err.message)
      setMsg({ type: "error", text: err?.message || "Sign up failed." });
    } finally {
      setLoading(false);
    }
  }



  async function resendOtp() {
    if (!formData.email) return;
    await sendOtpEmail(formData.email.trim(), formData.username.trim());
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center font-poppins px-4">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-cyan-50 to-blue-100" />
        <div className="absolute -top-24 -left-24 h-[32rem] w-[32rem] rounded-full bg-emerald-300/50 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute top-1/3 right-0 h-[28rem] w-[28rem] rounded-full bg-cyan-300/50 blur-3xl dark:bg-cyan-700/20" />
        <div className="absolute -bottom-32 left-1/4 h-[24rem] w-[24rem] rounded-full bg-blue-300/40 blur-3xl dark:bg-blue-700/20" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="absolute -inset-2 bg-gradient-to-br from-emerald-400/25 via-cyan-400/20 to-blue-400/25 rounded-3xl blur-xl opacity-40" />

        <Card className="relative overflow-hidden w-full rounded-3xl border-white/60 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-white/40 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 via-cyan-400/15 to-blue-400/20" />

          <CardHeader className="relative space-y-1">
            <CardTitle className="text-2xl text-slate-900">
              {isLogin ? "Sign In" : "Create Account"}
            </CardTitle>
            <CardDescription className="text-slate-600">
              {isLogin
                ? "Enter your credentials to access your account"
                : "Fill in your details to get started"}
            </CardDescription>
          </CardHeader>

          <CardContent className="relative">
            {msg.text ? (
              <Alert
                className={`mb-4 backdrop-blur shadow-md ${msg.type === "error"
                  ? "bg-rose-50/90 border-rose-200 text-rose-700"
                  : "bg-emerald-50/90 border-emerald-200 text-emerald-700"
                  }`}
              >
                <AlertDescription className="font-medium text-center">
                  {msg.text}
                </AlertDescription>
              </Alert>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={onChange}
                      placeholder="johndoe"
                      autoComplete="username"
                      className={error.username ? "border-rose-400 focus-visible:ring-rose-400" : ""}
                    />
                    {error.username && <p className="text-[10px] text-rose-500 font-medium px-1 mt-0.5">{error.username}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={onChange}
                        placeholder="John"
                        autoComplete="given-name"
                        className={error.first_name ? "border-rose-400 focus-visible:ring-rose-400" : ""}
                      />
                      {error.first_name && <p className="text-[10px] text-rose-500 font-medium px-1 mt-0.5">{error.first_name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={onChange}
                        placeholder="Doe"
                        autoComplete="family-name"
                        className={error.last_name ? "border-rose-400 focus-visible:ring-rose-400" : ""}
                      />
                      {error.last_name && <p className="text-[10px] text-rose-500 font-medium px-1 mt-0.5">{error.last_name}</p>}
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor={isLogin ? "usernameOrEmail" : "email"}>
                  {isLogin ? "Email or Username" : "Email Address"}
                </Label>
                <Input
                  id={isLogin ? "usernameOrEmail" : "email"}
                  type={isLogin ? "text" : "email"}
                  name={isLogin ? "usernameOrEmail" : "email"}
                  value={isLogin ? formData.usernameOrEmail : formData.email}
                  onChange={onChange}
                  placeholder={isLogin ? "you@example.com or johndoe" : "you@example.com"}
                  autoComplete="email"
                  className={(isLogin && error.usernameOrEmail) || (!isLogin && error.email) ? "border-rose-400 focus-visible:ring-rose-400" : ""}
                />
                {isLogin && error.usernameOrEmail && <p className="text-[10px] text-rose-500 font-medium px-1 mt-0.5">{error.usernameOrEmail}</p>}
                {!isLogin && error.email && <p className="text-[10px] text-rose-500 font-medium px-1 mt-0.5">{error.email}</p>}
              </div>

              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={onChange}
                      placeholder="+63 912 345 6789"
                      autoComplete="tel"
                      className={error.phone ? "border-rose-400 focus-visible:ring-rose-400" : ""}
                    />
                    {error.phone && <p className="text-[10px] text-rose-500 font-medium px-1 mt-0.5">{error.phone}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Home Address</Label>
                    <Input
                      id="address"
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={onChange}
                      placeholder="123 Street, City, Province"
                      autoComplete="street-address"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={onChange}
                  placeholder="••••••••"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={onChange}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              )}

              {isLogin && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-emerald-600"
                    onClick={() =>
                      setMsg({
                        type: "ok",
                        text: "Please contact the administrator to reset your password.",
                      })
                    }
                  >
                    Forgot your password?
                  </Button>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || sendingOtp}
                className="w-full shadow-md hover:shadow-lg transition-all"
              >
                {loading || sendingOtp
                  ? isLogin
                    ? "Signing in…"
                    : sendingOtp
                      ? "Sending code…"
                      : "Creating…"
                  : isLogin
                    ? "Sign In"
                    : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-slate-600">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              </span>
              <Button variant="link" onClick={toggleForm} className="p-0">
                {isLogin ? "Sign up here!" : "Sign in here!"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={otpDialogOpen} onOpenChange={setOtpDialogOpen}>

        <DialogContent className="sm:max-w-md bg-white/90 backdrop-blur border-white/60 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Email Verification</DialogTitle>
            <DialogDescription>
              Enter the 6-digit code we sent to <b>{formData.email || "your email"}</b>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="otp">One-Time Password (OTP)</Label>
            <Input
              id="otp"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
            />
            <p className="text-xs text-slate-500">
              Code expires in 10 minutes. Check your spam folder if you don't see it.
            </p>
          </div>
          {error.otp && <p className="text-[12px] text-rose-500 font-medium px-1 mt-0.5">{error.otp}</p>}
          <DialogFooter className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={resendOtp}
              disabled={sendingOtp}
              className="shadow-md hover:shadow-lg transition-all"
            >
              {sendingOtp ? "Sending…" : "Resend Code"}
            </Button>
            <Button
              type="button"
              onClick={verifyAndCreate}
              disabled={loading}
              className="shadow-md hover:shadow-lg transition-all"
            >
              Verify & Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
