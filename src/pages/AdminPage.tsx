import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  clearAuthToken,
  deleteAdminAppointment,
  deleteAdminChatMessage,
  deleteAdminReminder,
  deleteAdminUser,
  getAdminOverview,
  getCurrentUser,
  type AdminOverview,
  updateAdminPrescriptionStatus,
} from "../services/api";

type AdminTab = "usuarios" | "consultas" | "lembretes" | "chat" | "receitas";

const initialOverview: AdminOverview = {
  users: [],
  appointments: [],
  reminders: [],
  chatMessages: [],
  prescriptionRequests: [],
};

export function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>("usuarios");
  const [feedback, setFeedback] = useState("Carregando painel administrativo...");
  const [overview, setOverview] = useState<AdminOverview>(initialOverview);
  const [isLoading, setIsLoading] = useState(true);

  const stats = useMemo(
    () => [
      { label: "Usuários", value: overview.users.length },
      { label: "Consultas", value: overview.appointments.length },
      { label: "Lembretes", value: overview.reminders.length },
      { label: "Mensagens", value: overview.chatMessages.length },
      { label: "Receitas", value: overview.prescriptionRequests.length },
    ],
    [overview],
  );

  async function loadAdminData() {
    const [meResult, adminResult] = await Promise.all([getCurrentUser(), getAdminOverview()]);

    if (!meResult.ok || !meResult.data) {
      clearAuthToken();
      navigate("/login", { replace: true });
      return;
    }

    if (!meResult.data.isAdmin) {
      clearAuthToken();
      navigate("/admin/login", { replace: true });
      return;
    }

    if (!adminResult.ok || !adminResult.data) {
      setFeedback(adminResult.message || "Erro ao carregar dados administrativos.");
      setIsLoading(false);
      return;
    }

    setOverview(adminResult.data);
    setFeedback(adminResult.message);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadAdminData();
  }, []);

  async function handleDeleteUser(id: number) {
    const result = await deleteAdminUser(id);
    setFeedback(result.message);
    if (result.ok) {
      setOverview((current) => ({ ...current, users: current.users.filter((item) => item.id !== id) }));
    }
  }

  async function handleDeleteAppointment(id: number) {
    const result = await deleteAdminAppointment(id);
    setFeedback(result.message);
    if (result.ok) {
      setOverview((current) => ({
        ...current,
        appointments: current.appointments.filter((item) => item.id !== id),
      }));
    }
  }

  async function handleDeleteReminder(id: number) {
    const result = await deleteAdminReminder(id);
    setFeedback(result.message);
    if (result.ok) {
      setOverview((current) => ({ ...current, reminders: current.reminders.filter((item) => item.id !== id) }));
    }
  }

  async function handleDeleteChatMessage(id: number) {
    const result = await deleteAdminChatMessage(id);
    setFeedback(result.message);
    if (result.ok) {
      setOverview((current) => ({
        ...current,
        chatMessages: current.chatMessages.filter((item) => item.id !== id),
      }));
    }
  }

  async function handleUpdatePrescriptionStatus(id: number, status: "pendente" | "atendida") {
    const result = await updateAdminPrescriptionStatus(id, status);
    setFeedback(result.message);
    if (result.ok) {
      setOverview((current) => ({
        ...current,
        prescriptionRequests: current.prescriptionRequests.map((item) =>
          item.id === id ? { ...item, status } : item,
        ),
      }));
    }
  }

  return (
    <main className="admin-page">
      <section className="admin-card">
        <div className="admin-header">
          <div>
            <h1>Painel Administrativo</h1>
            <p>Controle geral dos dados registrados pelos usuários.</p>
          </div>
          <div className="admin-header-actions">
            <button type="button" onClick={() => void loadAdminData()}>
              Atualizar
            </button>
            <Link to="/dashboard">Voltar ao dashboard</Link>
          </div>
        </div>

        <div className="admin-stats">
          {stats.map((item) => (
            <article key={item.label}>
              <h3>{item.value}</h3>
              <p>{item.label}</p>
            </article>
          ))}
        </div>

        <p className="admin-feedback">{feedback}</p>

        <div className="admin-tabs">
          <button type="button" className={activeTab === "usuarios" ? "active" : ""} onClick={() => setActiveTab("usuarios")}>
            Usuários
          </button>
          <button type="button" className={activeTab === "consultas" ? "active" : ""} onClick={() => setActiveTab("consultas")}>
            Consultas
          </button>
          <button type="button" className={activeTab === "lembretes" ? "active" : ""} onClick={() => setActiveTab("lembretes")}>
            Lembretes
          </button>
          <button type="button" className={activeTab === "chat" ? "active" : ""} onClick={() => setActiveTab("chat")}>
            Chat
          </button>
          <button type="button" className={activeTab === "receitas" ? "active" : ""} onClick={() => setActiveTab("receitas")}>
            Receitas
          </button>
        </div>

        {isLoading ? <p className="admin-empty">Carregando...</p> : null}

        {!isLoading && activeTab === "usuarios" ? (
          <div className="admin-list">
            {overview.users.map((item) => (
              <div key={item.id} className="admin-row">
                <p>
                  #{item.id} - {item.name} ({item.email}) - criado em {item.createdAt}
                </p>
                <button type="button" onClick={() => void handleDeleteUser(item.id)}>
                  Excluir
                </button>
              </div>
            ))}
            {overview.users.length === 0 ? <p className="admin-empty">Nenhum usuário encontrado.</p> : null}
          </div>
        ) : null}

        {!isLoading && activeTab === "consultas" ? (
          <div className="admin-list">
            {overview.appointments.map((item) => (
              <div key={item.id} className="admin-row">
                <p>
                  #{item.id} - {item.userName} ({item.userEmail}) | {item.date} {item.time} | {item.doctor} -{" "}
                  {item.specialty} [{item.status}]
                </p>
                <button type="button" onClick={() => void handleDeleteAppointment(item.id)}>
                  Excluir
                </button>
              </div>
            ))}
            {overview.appointments.length === 0 ? <p className="admin-empty">Nenhuma consulta encontrada.</p> : null}
          </div>
        ) : null}

        {!isLoading && activeTab === "lembretes" ? (
          <div className="admin-list">
            {overview.reminders.map((item) => (
              <div key={item.id} className="admin-row">
                <p>
                  #{item.id} - {item.userName} ({item.userEmail}) | {item.title} | {item.date}
                </p>
                <button type="button" onClick={() => void handleDeleteReminder(item.id)}>
                  Excluir
                </button>
              </div>
            ))}
            {overview.reminders.length === 0 ? <p className="admin-empty">Nenhum lembrete encontrado.</p> : null}
          </div>
        ) : null}

        {!isLoading && activeTab === "chat" ? (
          <div className="admin-list">
            {overview.chatMessages.map((item) => (
              <div key={item.id} className="admin-row">
                <p>
                  #{item.id} - {item.userName} ({item.userEmail}) | {item.sender}/{item.kind} | {item.content}
                </p>
                <button type="button" onClick={() => void handleDeleteChatMessage(item.id)}>
                  Excluir
                </button>
              </div>
            ))}
            {overview.chatMessages.length === 0 ? <p className="admin-empty">Nenhuma mensagem encontrada.</p> : null}
          </div>
        ) : null}

        {!isLoading && activeTab === "receitas" ? (
          <div className="admin-list">
            {overview.prescriptionRequests.map((item) => (
              <div key={item.id} className="admin-row">
                <p>
                  #{item.id} - {item.userName} ({item.userEmail}) | {item.medicine} | status: {item.status}
                </p>
                <div className="admin-inline-actions">
                  <button type="button" onClick={() => void handleUpdatePrescriptionStatus(item.id, "pendente")}>
                    Pendente
                  </button>
                  <button type="button" onClick={() => void handleUpdatePrescriptionStatus(item.id, "atendida")}>
                    Atendida
                  </button>
                </div>
              </div>
            ))}
            {overview.prescriptionRequests.length === 0 ? (
              <p className="admin-empty">Nenhuma solicitação de receita encontrada.</p>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
