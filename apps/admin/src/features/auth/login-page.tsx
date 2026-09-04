import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { defaultRouteForRole } from "@/routes/nav-config";
import "./login-page.css";

/** Depot clock. Gate, trip and fuel records are all timestamped, so the operator
 *  signing in at the start of a shift sees the same time the log will record. */
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function LoginPage() {
  const navigate = useNavigate();
  const login = useSession((s) => s.login);
  const now = useClock();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const date = now
    .toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short" })
    .replace(/,/g, "")
    .toUpperCase();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter your username and password to continue.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(defaultRouteForRole(useSession.getState().role));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fx-login">
      <img className="fx-photo" src="/login-bg.jpg" alt="" />
      <div className="fx-scrim" aria-hidden />
      <div className="fx-scrim-mobile" aria-hidden />

      <header className="fx-brand">
        {/* <img className="fx-wordmark" src="/fleetora-wordmark.png" alt="Fleetora" /> */}
        <img className="fx-wordmark" src="/drive-logo.png" alt="D-RIVE" />
        <p className="fx-brand-sub">Intelligent Fleet Management System</p>
        <p className="fx-powered">
          powered by
          <img className="fx-sigma" src="/sigma-soft-logo.png" alt="" />
          Sigma Soft
        </p>
      </header>

      <p className="fx-colophon">© {now.getFullYear()} Fleetora. All rights reserved.</p>

      <section className="fx-panel">
        <div className="fx-panel-inner">
          <div className="fx-clock">
            <span>{date}</span>
            <span className="fx-clock-time">{time}</span>
          </div>

          <div className="fx-panel-brand">
            {/* <img className="fx-panel-wordmark" src="/fleetora-wordmark.png" alt="Fleetora" /> */}
            <img className="fx-panel-wordmark" src="/drive-logo.png" alt="D-RIVE" />
          </div>

          <p className="fx-eyebrow">Fleet operations console</p>
          <h1 className="fx-title">Sign in</h1>

          <form className="fx-form" onSubmit={handleSubmit}>
            <div className="fx-field">
              <label className="fx-label" htmlFor="fx-user">
                Username or email
              </label>
              <div className="fx-well">
                <input
                  id="fx-user"
                  className="fx-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="fx-field">
              <label className="fx-label" htmlFor="fx-pass">
                Password
              </label>
              <div className="fx-well">
                <input
                  id="fx-pass"
                  className="fx-input fx-input--password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="fx-peek"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="button"
              className="fx-forgot"
              onClick={() => toast("Password resets aren't wired up yet. Ask your fleet administrator.")}
            >
              Forgot password?
            </button>

            <button className="fx-submit" type="submit" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
              <ArrowRight size={18} />
            </button>
          </form>

          <p className="fx-help">
            No account?{" "}
            <button
              type="button"
              onClick={() => toast("Your fleet administrator creates accounts under Users & Permissions.")}
            >
              Ask your fleet administrator
            </button>{" "}
            to create one.
          </p>
        </div>
      </section>
    </div>
  );
}
