import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCurrentUser } from "../services/api";

export default function AuthCallback({ onAuthSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("status");
    const errParam = params.get("error");

    if (status === "success") {
      getCurrentUser()
        .then((response) => {
          if (response.data) {
            onAuthSuccess(response.data);
            navigate("/", { replace: true });
          } else {
            navigate("/login?error=google_auth_failed", { replace: true });
          }
        })
        .catch(() => {
          navigate("/login?error=google_auth_failed", { replace: true });
        });
    } else {
      const errorMsg = errParam || "google_auth_failed";
      navigate(`/login?error=${errorMsg}`, { replace: true });
    }
  }, [location.search, navigate, onAuthSuccess]);

  return (
    <>
      <style>{`
        .auth-callback-container {
          min-height: 80vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, #14060b 0%, #260b14 48%, #100409 100%);
          color: #fff;
          font-family: 'Jost', sans-serif;
          gap: 1.5rem;
        }

        .auth-spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top: 3px solid #e8536d;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .auth-text {
          font-size: 1.1rem;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.7);
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div className="auth-callback-container">
        <div className="auth-spinner" />
        <p className="auth-text">Completing Google authentication...</p>
      </div>
    </>
  );
}
