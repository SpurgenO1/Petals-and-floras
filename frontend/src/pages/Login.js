import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getCurrentUser, loginUser, registerUser } from "../services/api";

const initialLoginState = { email: "", password: "" };
const initialRegisterState = { name: "", email: "", confirmEmail: "", password: "" };

function extractError(error, fallback) {
  const data = error?.response?.data;
  if (!data) {
    if (error?.code === "ERR_NETWORK") {
      return "Cannot reach the backend server. Restart the backend and try again.";
    }

    if (error?.response?.status === 404) {
      return "Auth API is unavailable right now. Restart the backend and try again.";
    }
  }

  if (!data) {
    return fallback;
  }

  if (typeof data.error === "string") {
    if (data.error === "Not authenticated") {
      return "Login session could not be verified. Refresh the page and try again.";
    }
    return data.error;
  }

  const firstFieldError = Object.values(data).find((value) => Array.isArray(value) && value[0]);
  if (firstFieldError) {
    return firstFieldError[0];
  }

  return fallback;
}

export default function Login({ authUser, onAuthSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLoginState);
  const [registerForm, setRegisterForm] = useState(initialRegisterState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const activeForm = useMemo(
    () => (mode === "login" ? loginForm : registerForm),
    [loginForm, mode, registerForm]
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const verified = params.get("verified");
    const email = params.get("email");

    if (verified === "success") {
      setMode("login");
      setError("");
      setMessage(
        email
          ? `Email verified for ${email}. You can log in now.`
          : "Email verified successfully. You can log in now."
      );
    } else if (verified === "error") {
      setMode("login");
      setMessage("");
      setError("That verification link is invalid or has expired. Please register again.");
    }
  }, [location.search]);

  if (authUser) {
    return <Navigate to="/" replace />;
  }

  const updateField = (field, value) => {
    setError("");
    setMessage("");

    if (mode === "login") {
      setLoginForm((current) => ({ ...current, [field]: value }));
      return;
    }

    setRegisterForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "register") {
        const normalizedEmail = registerForm.email.trim().toLowerCase();
        const normalizedConfirmEmail = registerForm.confirmEmail.trim().toLowerCase();

        if (normalizedEmail !== normalizedConfirmEmail) {
          throw new Error("Email addresses do not match");
        }
      }

      const authResponse =
        mode === "login"
          ? await loginUser(loginForm)
          : await registerUser({
              name: registerForm.name,
              email: registerForm.email,
              password: registerForm.password,
            });

      if (mode === "register") {
        setRegisterForm(initialRegisterState);
        setMode("login");
        setMessage(authResponse.data?.message || "Account created. Check your email to verify your address.");
        return;
      }

      const sessionResponse = await getCurrentUser().catch(() => null);
      const authenticatedUser = sessionResponse?.data || authResponse.data?.user;
      if (!sessionResponse?.data) {
        throw new Error("Login succeeded, but the Django session was not created. Please sign in again.");
      }

      onAuthSuccess?.(authenticatedUser);
      setMessage(authResponse.data?.message || "Logged in successfully");
      navigate("/", { replace: true });

    } catch (requestError) {
      const isRequestError = Boolean(requestError?.response || requestError?.code);
      setError(
        isRequestError
          ? extractError(
              requestError,
              mode === "login" ? "Unable to login right now." : "Unable to create account right now."
            )
          : (requestError.message || "Something went wrong.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .auth-page {
          min-height: 100vh;
          padding: calc(var(--nav-height) + 2rem) 1.25rem 4rem;
          background:
            radial-gradient(circle at top left, rgba(215, 181, 109, 0.18), transparent 35%),
            radial-gradient(circle at bottom right, rgba(232, 83, 109, 0.18), transparent 35%),
            linear-gradient(145deg, #14060b 0%, #260b14 48%, #100409 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Jost', sans-serif;
        }

        .auth-shell {
          width: min(100%, 1080px);
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          background: rgba(23, 7, 13, 0.78);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 40px 100px rgba(0,0,0,0.45);
          backdrop-filter: blur(18px);
        }

        .auth-story {
          padding: 3rem;
          background:
            radial-gradient(circle at 20% 20%, rgba(215, 181, 109, 0.22), transparent 28%),
            linear-gradient(180deg, rgba(123, 26, 46, 0.94), rgba(38, 11, 20, 0.94));
          color: #fff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 2rem;
        }

        .auth-kicker {
          font-size: 0.82rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.72);
        }

        .auth-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2.5rem, 5vw, 4.4rem);
          line-height: 0.95;
          margin: 1rem 0;
        }

        .auth-title span {
          color: #d7b56d;
        }

        .auth-copy {
          max-width: 30rem;
          color: rgba(255,255,255,0.82);
          font-size: 1rem;
          line-height: 1.8;
        }

        .auth-points {
          display: grid;
          gap: 0.9rem;
        }

        .auth-point {
          padding: 0.95rem 1rem;
          border-radius: 18px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.8);
        }

        .auth-card {
          padding: 2.5rem 2rem;
          background: rgba(255,255,255,0.04);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .auth-tabs {
          display: inline-grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.35rem;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 0.35rem;
          border-radius: 999px;
          margin-bottom: 1.5rem;
        }

        .auth-tab {
          border: none;
          border-radius: 999px;
          padding: 0.8rem 1rem;
          background: transparent;
          color: rgba(255,255,255,0.62);
          cursor: pointer;
          font: inherit;
          transition: all 0.22s ease;
        }

        .auth-tab.active {
          background: linear-gradient(135deg, #e8536d, #7b1a2e);
          color: #fff;
          box-shadow: 0 10px 24px rgba(232, 83, 109, 0.28);
        }

        .auth-form-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.1rem;
          color: #fff;
          margin-bottom: 0.4rem;
        }

        .auth-form-copy {
          color: rgba(255,255,255,0.62);
          margin-bottom: 1.6rem;
        }

        .auth-form {
          display: grid;
          gap: 1rem;
        }

        .auth-field {
          display: grid;
          gap: 0.45rem;
        }

        .auth-label {
          color: rgba(255,255,255,0.72);
          font-size: 0.92rem;
        }

        .auth-input {
          width: 100%;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          color: #fff;
          border-radius: 16px;
          padding: 0.95rem 1rem;
          outline: none;
          font: inherit;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .auth-input:focus {
          border-color: rgba(232, 83, 109, 0.8);
          box-shadow: 0 0 0 3px rgba(232, 83, 109, 0.14);
          background: rgba(255,255,255,0.08);
        }

        .auth-submit {
          margin-top: 0.4rem;
          border: none;
          border-radius: 999px;
          padding: 1rem 1.1rem;
          color: #fff;
          background: linear-gradient(135deg, #e8536d, #7b1a2e);
          font: inherit;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 16px 30px rgba(232, 83, 109, 0.24);
        }

        .auth-submit:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .auth-feedback {
          border-radius: 16px;
          padding: 0.85rem 1rem;
          font-size: 0.92rem;
        }

        .auth-feedback.error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.28);
          color: #fecaca;
        }

        .auth-feedback.success {
          background: rgba(34, 197, 94, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.28);
          color: #bbf7d0;
        }

        .auth-note {
          margin-top: 1rem;
          color: rgba(255,255,255,0.52);
          font-size: 0.86rem;
          line-height: 1.7;
        }

        @media (max-width: 900px) {
          .auth-shell {
            grid-template-columns: 1fr;
          }

          .auth-story {
            padding: 2rem 1.5rem;
          }

          .auth-card {
            padding: 2rem 1.25rem;
          }
        }

        @media (max-width: 640px) {
          .auth-page {
            padding: calc(var(--nav-height) + 1.25rem) 0.85rem 3rem;
            align-items: flex-start;
          }

          .auth-shell {
            border-radius: 22px;
          }

          .auth-story {
            padding: 1.5rem 1rem;
            gap: 1.25rem;
          }

          .auth-card {
            padding: 1.5rem 1rem;
          }

          .auth-form-title {
            font-size: 1.8rem;
          }

          .auth-copy,
          .auth-note {
            font-size: 0.92rem;
          }
        }
      `}</style>

      <section className="auth-page">
        <div className="auth-shell">
          <div className="auth-story">
            <div>
              <p className="auth-kicker">Petals & Flora Members</p>
              <h1 className="auth-title">
                Bloom into a <span>personal account</span>
              </h1>
              <p className="auth-copy">
                Sign in to keep your flower journey personal. Save your details,
                return faster at checkout, and stay connected with your favorite floral picks.
              </p>
            </div>

            <div className="auth-points">
              <div className="auth-point">Faster future checkouts for your bouquets and gift orders.</div>
              <div className="auth-point">A cleaner shopping flow with your own signed-in session.</div>
              <div className="auth-point">A premium branded login experience that matches the website.</div>
            </div>
          </div>

          <div className="auth-card">
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${mode === "login" ? "active" : ""}`}
                onClick={() => setMode("login")}
              >
                Login
              </button>
              <button
                type="button"
                className={`auth-tab ${mode === "register" ? "active" : ""}`}
                onClick={() => setMode("register")}
              >
                Create Account
              </button>
            </div>

            <h2 className="auth-form-title">
              {mode === "login" ? "Welcome Back" : "Create Your Account"}
            </h2>
            <p className="auth-form-copy">
              {mode === "login"
                ? "Sign in with your email and password."
                : "Create a simple account to start shopping faster."}
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              {mode === "register" && (
                <div className="auth-field">
                  <label className="auth-label" htmlFor="name">Full Name</label>
                  <input
                    id="name"
                    className="auth-input"
                    value={registerForm.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              )}

              <div className="auth-field">
                <label className="auth-label" htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  className="auth-input"
                  value={activeForm.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              {mode === "register" && (
                <div className="auth-field">
                  <label className="auth-label" htmlFor="confirmEmail">Confirm Email Address</label>
                  <input
                    id="confirmEmail"
                    type="email"
                    className="auth-input"
                    value={registerForm.confirmEmail}
                    onChange={(event) => updateField("confirmEmail", event.target.value)}
                    placeholder="Re-enter your email"
                    required
                  />
                </div>
              )}

              <div className="auth-field">
                <label className="auth-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="auth-input"
                  value={activeForm.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              {error && <div className="auth-feedback error">{error}</div>}
              {message && <div className="auth-feedback success">{message}</div>}

              <button className="auth-submit" type="submit" disabled={loading}>
                {loading
                  ? (mode === "login" ? "Signing In..." : "Sending Verification Email...")
                  : (mode === "login" ? "Login" : "Create Account")}
              </button>
            </form>

            <p className="auth-note">
              {mode === "login"
                ? "This login uses your site backend directly, so you stay inside the Petals & Flora experience."
                : "We will send a verification link to your email before you can log in."}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
