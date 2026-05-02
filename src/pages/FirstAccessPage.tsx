import { Link } from "react-router-dom";

export function FirstAccessPage() {
  return (
    <main className="first-access-page">
      <section className="access-card" aria-label="Primeiro acesso à plataforma Saúde Saudável">
        <h1 className="brand-title">
          SAÚDE
          <br />
          SAUDÁVEL
        </h1>

        <p className="brand-subtitle">Sua comodidade, nossa prioridade</p>

        <Link to="/login" className="primary-action">
          Entrar na Plataforma
        </Link>

        <Link to="/cadastro" className="secondary-action">
          Criar nova conta
        </Link>

        <Link to="/admin/login" className="admin-access-link">
          Acesso administrativo
        </Link>

        <p className="support-message">
          Acesse nossa plataforma completa de saúde com facilidade e segurança
        </p>
      </section>
    </main>
  );
}
