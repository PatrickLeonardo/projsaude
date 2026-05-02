import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginAdmin, registerAdmin, saveAuthToken } from "../services/api";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setFeedback("");

    if (!isValidEmail(email)) {
      setFeedback("Informe um e-mail válido.");
      setIsLoading(false);
      return;
    }

    if (mode === "register") {
      if (!name.trim()) {
        setFeedback("Informe o nome do administrador.");
        setIsLoading(false);
        return;
      }

      const registerResult = await registerAdmin({ name, email, password });
      if (registerResult.ok) {
        setFeedback("Administrador cadastrado com sucesso. Faça login para acessar o painel.");
        setMode("login");
        setPassword("");
      } else {
        setFeedback(registerResult.message);
      }
      setIsLoading(false);
      return;
    }

    const loginResult = await loginAdmin({ email, password });
    if (loginResult.ok && loginResult.data) {
      saveAuthToken(loginResult.data.token, true);
      setFeedback(`Bem-vindo(a), ${loginResult.data.user.name}. Redirecionando para o painel...`);
      setTimeout(() => navigate("/admin"), 500);
    } else {
      setFeedback(loginResult.message);
    }
    setIsLoading(false);
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-label="Tela de login administrativo">
        <h1 className="auth-title">{mode === "login" ? "Login Administrativo" : "Cadastro de Administrador"}</h1>
        <p className="auth-subtitle">
          {mode === "login"
            ? "Acesso exclusivo para administradores da plataforma."
            : "Cadastre um novo administrador para acessar o painel."}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <>
              <label className="auth-label" htmlFor="admin-name">
                Nome do administrador
              </label>
              <input
                id="admin-name"
                type="text"
                className="auth-input"
                placeholder="Nome completo"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </>
          ) : null}

          <label className="auth-label" htmlFor="admin-email">
            Email do administrador
          </label>
          <input
            id="admin-email"
            type="email"
            className="auth-input"
            placeholder="admin@empresa.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label className="auth-label" htmlFor="admin-password">
            Senha
          </label>
          <input
            id="admin-password"
            type="password"
            className="auth-input"
            placeholder="Digite sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? "Validando..." : mode === "login" ? "Entrar no painel" : "Cadastrar administrador"}
          </button>
        </form>

        {feedback ? <p className="auth-feedback">{feedback}</p> : null}

        <button
          type="button"
          className="auth-switch-mode"
          onClick={() => {
            setFeedback("");
            setMode((current) => (current === "login" ? "register" : "login"));
          }}
        >
          {mode === "login" ? "Cadastrar novo administrador" : "Já tenho cadastro administrativo"}
        </button>

        <p className="auth-footer">
          É paciente? <Link to="/login">Acesse o login da plataforma</Link>
        </p>
        <Link to="/" className="back-link">
          Voltar ao primeiro acesso
        </Link>
      </section>
    </main>
  );
}
