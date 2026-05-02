import { Link } from "react-router-dom";
import { useState, type FormEvent } from "react";
import { registerUser } from "../services/api";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password: string) {
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasMinLength && hasUpper && hasLower && hasDigit && hasSpecial;
}

export function RegisterPage() {
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

    if (!isStrongPassword(password)) {
      setFeedback("Senha fraca. Use 8+ caracteres com maiúscula, minúscula, número e símbolo.");
      setIsLoading(false);
      return;
    }

    const result = await registerUser({ name, email, password });
    setFeedback(result.message);
    if (result.ok) {
      setName("");
      setEmail("");
      setPassword("");
    }
    setIsLoading(false);
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-label="Tela de cadastro">
        <h1 className="auth-title">Criar Conta</h1>
        <p className="auth-subtitle">Cadastre-se para usar os serviços da plataforma.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="nome">
            Nome completo
          </label>
          <input
            id="nome"
            type="text"
            className="auth-input"
            placeholder="Seu nome completo"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <label className="auth-label" htmlFor="novo-email">
            Email
          </label>
          <input
            id="novo-email"
            type="email"
            className="auth-input"
            placeholder="você@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label className="auth-label" htmlFor="nova-senha">
            Senha
          </label>
          <input
            id="nova-senha"
            type="password"
            className="auth-input"
            placeholder="Crie uma senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />

          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

        {feedback ? <p className="auth-feedback">{feedback}</p> : null}

        <p className="auth-footer">
          Já possui conta? <Link to="/login">Fazer login</Link>
        </p>
        <Link to="/" className="back-link">
          Voltar ao primeiro acesso
        </Link>
      </section>
    </main>
  );
}
