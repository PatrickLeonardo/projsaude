import { Link, useNavigate } from "react-router-dom";
import { useState, type FormEvent } from "react";
import { loginUser, saveAuthToken } from "../services/api";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function LoginPage() {
  const navigate = useNavigate();
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

    const result = await loginUser({ email, password });
    if (result.ok && result.data) {
      saveAuthToken(result.data.token, result.data.user.isAdmin);
      setFeedback(`Bem-vindo(a), ${result.data.user.name}. Redirecionando...`);
      setTimeout(() => navigate("/dashboard"), 500);
    } else {
      setFeedback(result.message);
    }
    setIsLoading(false);
  }

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
