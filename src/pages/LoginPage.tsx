import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { loginUser, loginWithApple, loginWithGoogle, saveAuthToken } from "../services/api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number | boolean | undefined>,
          ) => void;
          prompt: () => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (options: {
          clientId: string;
          scope: string;
          usePopup: boolean;
          redirectURI?: string;
        }) => void;
        signIn: () => Promise<{
          authorization?: { id_token?: string };
          user?: { name?: { firstName?: string; lastName?: string } };
        }>;
      };
    };
  }
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function LoginPage() {
  const navigate = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const googleClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();
  const appleClientId = String(import.meta.env.VITE_APPLE_CLIENT_ID ?? "").trim();

  async function finishLogin(token: string, name: string, isAdmin: boolean) {
    saveAuthToken(token, isAdmin);
    setFeedback(`Bem-vindo(a), ${name}. Redirecionando...`);
    setTimeout(() => navigate("/dashboard"), 500);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setFeedback("");

    if (!isValidEmail(email)) {
      setFeedback("Informe um e-mail válido.");
      setIsLoading(false);
      return;
    }

    const result = await loginUser({ email, password });
    if (result.ok && result.data) {
      await finishLogin(result.data.token, result.data.user.name, result.data.user.isAdmin);
    } else {
      setFeedback(result.message);
    }
    setIsLoading(false);
  }

  async function handleGoogleCredential(credential: string) {
    setIsSocialLoading(true);
    setFeedback("");
    const result = await loginWithGoogle(credential);
    if (result.ok && result.data) {
      await finishLogin(result.data.token, result.data.user.name, result.data.user.isAdmin);
    } else {
      setFeedback(result.message);
    }
    setIsSocialLoading(false);
  }

  async function handleGoogleLoginClick() {
    if (!googleClientId) {
      setFeedback("Login Google indisponível: configure VITE_GOOGLE_CLIENT_ID no frontend.");
      return;
    }

    if (!window.google?.accounts?.id) {
      setFeedback("SDK do Google não carregada. Recarregue a página.");
      return;
    }

    window.google.accounts.id.prompt();
  }

  async function handleAppleLogin() {
    if (!appleClientId) {
      setFeedback("Login Apple indisponível: configure VITE_APPLE_CLIENT_ID.");
      return;
    }

    if (!window.AppleID?.auth) {
      setFeedback("SDK da Apple não carregada. Recarregue a página.");
      return;
    }

    setIsSocialLoading(true);
    setFeedback("");
    try {
      window.AppleID.auth.init({
        clientId: appleClientId,
        scope: "name email",
        usePopup: true,
      });
      const response = await window.AppleID.auth.signIn();
      const identityToken = String(response?.authorization?.id_token ?? "").trim();
      const firstName = String(response?.user?.name?.firstName ?? "").trim();
      const lastName = String(response?.user?.name?.lastName ?? "").trim();
      const fullName = `${firstName} ${lastName}`.trim();

      if (!identityToken) {
        setFeedback("Não foi possível obter o token da Apple.");
        setIsSocialLoading(false);
        return;
      }

      const result = await loginWithApple({ identityToken, fullName });
      if (result.ok && result.data) {
        await finishLogin(result.data.token, result.data.user.name, result.data.user.isAdmin);
      } else {
        setFeedback(result.message);
      }
    } catch (error) {
      setFeedback("Falha ao iniciar login com Apple.");
    }
    setIsSocialLoading(false);
  }

  useEffect(() => {
    function loadScript(src: string) {
      return new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
        if (existing) {
          if (existing.dataset.loaded === "true") {
            resolve();
            return;
          }
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(new Error(`Falha ao carregar ${src}`)), { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          script.dataset.loaded = "true";
          resolve();
        };
        script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
        document.body.appendChild(script);
      });
    }

    async function setupSocialLogin() {
      try {
        if (googleClientId) {
          await loadScript("https://accounts.google.com/gsi/client");
          if (window.google?.accounts?.id && googleButtonRef.current) {
            googleButtonRef.current.innerHTML = "";
            window.google.accounts.id.initialize({
              client_id: googleClientId,
              callback: (response) => {
                if (response.credential) {
                  void handleGoogleCredential(response.credential);
                } else {
                  setFeedback("Falha ao autenticar com Google.");
                }
              },
            });
            window.google.accounts.id.renderButton(googleButtonRef.current, {
              theme: "outline",
              size: "large",
              text: "continue_with",
              shape: "pill",
              width: 340,
            });
            setIsGoogleReady(true);
          }
        }

        if (appleClientId) {
          await loadScript("https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js");
        }
      } catch {
        setFeedback("Não foi possível carregar login social.");
      }
    }

    void setupSocialLogin();
  }, [googleClientId, appleClientId]);

  return (
    <main className="auth-page">
      <section className="auth-card" aria-label="Tela de login">
        <h1 className="auth-title">Entrar</h1>
        <p className="auth-subtitle">Use seu email e senha para acessar sua conta.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="auth-input"
            placeholder="você@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label className="auth-label" htmlFor="senha">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            className="auth-input"
            placeholder="Digite sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? "Validando..." : "Acessar"}
          </button>
        </form>

        <div className="auth-social-divider">
          <span>ou continue com</span>
        </div>
        <div className="auth-social-group">
          {googleClientId ? (
            <div ref={googleButtonRef} className="auth-google-slot" />
          ) : (
            <button
              type="button"
              className="auth-social-button google"
              onClick={() => void handleGoogleLoginClick()}
              disabled={isSocialLoading}
            >
              Entrar com Google
            </button>
          )}
          {googleClientId && !isGoogleReady ? (
            <button
              type="button"
              className="auth-social-button google"
              onClick={() => void handleGoogleLoginClick()}
              disabled={isSocialLoading}
            >
              Entrar com Google
            </button>
          ) : null}
          <button
            type="button"
            className="auth-social-button apple"
            onClick={() => void handleAppleLogin()}
            disabled={isSocialLoading}
          >
            {isSocialLoading ? "Conectando..." : "Entrar com Apple"}
          </button>
        </div>

        {feedback ? <p className="auth-feedback">{feedback}</p> : null}

        <p className="auth-footer">
          Ainda não tem conta? <Link to="/cadastro">Criar cadastro</Link>
        </p>
        <p className="auth-footer">
          É administrador? <Link to="/admin/login">Entrar no painel administrativo</Link>
        </p>
        <Link to="/" className="back-link">
          Voltar ao primeiro acesso
        </Link>
      </section>
    </main>
  );
}
