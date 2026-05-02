import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearAuthToken,
  createAppointment,
  createPrescriptionRequest,
  createReminder,
  deleteAppointment,
  deleteReminder,
  getAppointments,
  getChatMessages,
  getCurrentUser,
  getReminders,
  sendChatMessage as sendChatMessageApi,
  updateAppointment,
  updateReminder,
  type AppointmentApiItem,
  type ChatApiMessage,
  type ReminderApiItem,
} from "../services/api";

type User = {
  id: number;
  name: string;
  email: string;
  isAdmin?: boolean;
};

type Appointment = {
  id: number;
  date: string;
  time: string;
  doctor: string;
  specialty: string;
  type: "consulta" | "retorno" | "exame";
  status: "agendada" | "confirmada" | "pendente";
};

type Reminder = {
  id: number;
  title: string;
  message: string;
  date: string;
  category: "medicamento" | "especial";
  endDate?: string | null;
};

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatDateBr(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [feedback, setFeedback] = useState("Carregando dados...");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<"home" | "consultas" | "lembretes" | "chat">("home");
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isNewReminderOpen, setIsNewReminderOpen] = useState(false);
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<number | null>(null);
  const [editingReminderId, setEditingReminderId] = useState<number | null>(null);
  const [selectedAlertDays, setSelectedAlertDays] = useState(7);
  const [reminderFeedback, setReminderFeedback] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [chatFileInputKey, setChatFileInputKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [newAppointment, setNewAppointment] = useState({
    date: "",
    time: "",
    doctor: "",
    specialty: "",
    type: "consulta" as Appointment["type"],
    status: "agendada" as Appointment["status"],
  });
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newReminder, setNewReminder] = useState({
    title: "",
    message: "",
    date: "",
    category: "medicamento" as Reminder["category"],
    endDate: "",
  });
  const [prescriptionRequest, setPrescriptionRequest] = useState({
    medicine: "",
    details: "",
  });
  const [chatMessages, setChatMessages] = useState<ChatApiMessage[]>([]);

  const serviceCards = [
    { icon: "U", title: "MEU PERFIL" },
    { icon: "C", title: "CONSULTAS" },
    { icon: "L", title: "LEMBRETES" },
    { icon: "B", title: "BATE-PAPO" },
  ];
  const years = Array.from({ length: 6 }, (_, index) => now.getFullYear() - 1 + index);
  const alertDayOptions = [3, 5, 7, 10, 12, 14];

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => {
        const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
        if (Number.isNaN(appointmentDate.getTime())) {
          return false;
        }
        const inSelectedMonth =
          appointmentDate.getMonth() === selectedMonth && appointmentDate.getFullYear() === selectedYear;
        if (!inSelectedMonth) {
          return false;
        }
        if (!searchTerm.trim()) {
          return true;
        }
        const haystack = `${appointment.doctor} ${appointment.specialty} ${appointment.type}`.toLowerCase();
        return haystack.includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`).getTime();
        const dateB = new Date(`${b.date}T${b.time}`).getTime();
        return dateA - dateB;
      });
  }, [appointments, searchTerm, selectedMonth, selectedYear]);

  const monthDays = useMemo(() => {
    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();
    const totalDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const emptySlots = Array.from({ length: firstDayOfMonth }, () => null);
    const daySlots = Array.from({ length: totalDays }, (_, index) => index + 1);
    return [...emptySlots, ...daySlots];
  }, [selectedMonth, selectedYear]);

  const appointmentDays = useMemo(() => {
    const set = new Set<number>();
    appointments.forEach((appointment) => {
      const date = new Date(`${appointment.date}T00:00:00`);
      if (date.getMonth() === selectedMonth && date.getFullYear() === selectedYear) {
        set.add(date.getDate());
      }
    });
    return set;
  }, [appointments, selectedMonth, selectedYear]);

  function getDaysUntil(dateValue: string) {
    const today = new Date();
    const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endDate = new Date(`${dateValue}T00:00:00`);
    const diffMs = endDate.getTime() - currentDate.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  useEffect(() => {
    async function loadUser() {
      const result = await getCurrentUser();
      if (result.ok && result.data) {
        setUser(result.data);
        setFeedback("");
      } else {
        clearAuthToken();
        navigate("/login", { replace: true });
      }
    }

    void loadUser();
  }, [navigate]);

  useEffect(() => {
    async function loadPersistedData() {
      const [appointmentsResult, remindersResult] = await Promise.all([getAppointments(), getReminders()]);

      if (appointmentsResult.ok && appointmentsResult.data) {
        const mapped = appointmentsResult.data.map((item: AppointmentApiItem) => ({
          id: item.id,
          date: item.date,
          time: item.time,
          doctor: item.doctor,
          specialty: item.specialty,
          type: item.type,
          status: item.status,
        }));
        setAppointments(mapped);
      }

      if (remindersResult.ok && remindersResult.data) {
        const mapped = remindersResult.data.map((item: ReminderApiItem) => ({
          id: item.id,
          title: item.title,
          message: item.message,
          date: item.date,
          category: item.category,
          endDate: item.endDate ?? null,
        }));
        setReminders(mapped);
      }
    }

    void loadPersistedData();
  }, []);

  useEffect(() => {
    if (activePanel !== "chat" || chatLoaded === true) {
      return;
    }

    async function loadChatHistory() {
      const result = await getChatMessages();
      if (result.ok && result.data) {
        if (result.data.length > 0) {
          setChatMessages(result.data);
          setChatLoaded(true);
          return;
        }

        const welcomeMessage = "Olá! Bem-vindo ao chat da Saúde Saudável. Como posso ajudar hoje?";
        const welcomeResult = await sendChatMessageApi({
          sender: "bot",
          kind: "text",
          content: welcomeMessage,
        });
        if (welcomeResult.ok && welcomeResult.data) {
          setChatMessages([welcomeResult.data]);
        } else {
          setChatMessages([
            {
              id: Date.now(),
              sender: "bot",
              kind: "text",
              content: welcomeMessage,
              time: getNowTime(),
            },
          ]);
        }
        setChatLoaded(true);
        return;
      }

      setChatMessages([
        {
          id: Date.now(),
          sender: "system",
          kind: "text",
          content: "Não foi possível carregar o histórico do chat agora.",
          time: getNowTime(),
        },
      ]);
      setChatLoaded(true);
    }

    void loadChatHistory();
  }, [activePanel, chatLoaded]);

  function handleLogout() {
    clearAuthToken();
    navigate("/login", { replace: true });
  }

  function handleCardClick(title: string) {
    if (title === "MEU PERFIL") {
      setIsProfileOpen(true);
    }
    if (title === "CONSULTAS") {
      setActivePanel("consultas");
    }
    if (title === "LEMBRETES") {
      setActivePanel("lembretes");
    }
    if (title === "BATE-PAPO") {
      setActivePanel("chat");
    }
  }

  async function handleCreateAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newAppointment.date || !newAppointment.time || !newAppointment.doctor || !newAppointment.specialty) {
      return;
    }

    if (editingAppointmentId) {
      const result = await updateAppointment(editingAppointmentId, {
        date: newAppointment.date,
        time: newAppointment.time,
        doctor: newAppointment.doctor,
        specialty: newAppointment.specialty,
        type: newAppointment.type,
        status: newAppointment.status,
      });
      if (result.ok && result.data) {
        setAppointments((current) =>
          current.map((item) => (item.id === editingAppointmentId ? result.data! : item)),
        );
      }
    } else {
      const result = await createAppointment({
        date: newAppointment.date,
        time: newAppointment.time,
        doctor: newAppointment.doctor,
        specialty: newAppointment.specialty,
        type: newAppointment.type,
        status: newAppointment.status,
      });

      if (result.ok && result.data) {
        setAppointments((current) => [...current, result.data!]);
      }
    }

    setIsScheduleOpen(false);
    setEditingAppointmentId(null);
    setNewAppointment({
      date: "",
      time: "",
      doctor: "",
      specialty: "",
      type: "consulta",
      status: "agendada",
    });
  }

  async function handleCreateReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newReminder.title || !newReminder.message || !newReminder.date) {
      return;
    }

    if (editingReminderId) {
      const result = await updateReminder(editingReminderId, {
        title: newReminder.title,
        message: newReminder.message,
        date: newReminder.date,
        category: newReminder.category,
        endDate: newReminder.category === "medicamento" ? newReminder.endDate || null : null,
      });
      if (result.ok && result.data) {
        setReminders((current) => current.map((item) => (item.id === editingReminderId ? result.data! : item)));
      }
      setReminderFeedback(result.message);
    } else {
      const result = await createReminder({
        title: newReminder.title,
        message: newReminder.message,
        date: newReminder.date,
        category: newReminder.category,
        endDate: newReminder.category === "medicamento" ? newReminder.endDate || null : null,
      });
      if (result.ok && result.data) {
        setReminders((current) => [result.data!, ...current]);
      }
      setReminderFeedback(result.message);
    }
    setNewReminder({ title: "", message: "", date: "", category: "medicamento", endDate: "" });
    setIsNewReminderOpen(false);
    setEditingReminderId(null);
  }

  async function handleRequestPrescription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prescriptionRequest.medicine) {
      return;
    }

    const result = await createPrescriptionRequest({
      medicine: prescriptionRequest.medicine,
      details: prescriptionRequest.details,
    });
    setReminderFeedback(result.message);
    setPrescriptionRequest({ medicine: "", details: "" });
    setIsPrescriptionOpen(false);
  }

  function getNowTime() {
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
  }

  function getBotAnswer(message: string) {
    const normalized = message.toLowerCase();
    if (normalized.includes("consulta") || normalized.includes("agendar")) {
      return "Para agendar, abra o card Consultas e clique em 'Agendar Nova Consulta'. Posso te ajudar com isso também.";
    }
    if (normalized.includes("remédio") || normalized.includes("medicamento") || normalized.includes("receita")) {
      return "Você pode configurar avisos em Lembretes e usar o botão 'Solicitar Nova Receita' quando faltar medicação.";
    }
    if (normalized.includes("perfil") || normalized.includes("dados")) {
      return "Se quiser revisar seus dados, clique no ícone de usuário no topo do dashboard.";
    }
    return "Entendi! Vou registrar sua dúvida para nossa equipe de saúde. Se quiser, envie mais detalhes ou um anexo.";
  }

  function sendBotMessage(userText: string) {
    setIsBotTyping(true);
    window.setTimeout(async () => {
      const botContent = getBotAnswer(userText);
      const result = await sendChatMessageApi({
        sender: "bot",
        kind: "text",
        content: botContent,
      });

      if (result.ok && result.data) {
        setChatMessages((current) => [...current, result.data!]);
      } else {
        setChatMessages((current) => [
          ...current,
          {
            id: Date.now() + Math.floor(Math.random() * 1000),
            sender: "bot",
            kind: "text",
            content: botContent,
            time: getNowTime(),
          },
        ]);
      }
      setIsBotTyping(false);
    }, 700);
  }

  async function handleSendChatMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message) {
      return;
    }

    const result = await sendChatMessageApi({
      sender: "user",
      kind: "text",
      content: message,
    });

    if (result.ok && result.data) {
      setChatMessages((current) => [...current, result.data!]);
    } else {
      setChatMessages((current) => [
        ...current,
        {
          id: Date.now(),
          sender: "system",
          kind: "text",
          content: result.message,
          time: getNowTime(),
        },
      ]);
    }

    setChatInput("");
    sendBotMessage(message);
  }

  async function handleAttachFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const fileMessage = `Arquivo anexado: ${file.name}`;
    const result = await sendChatMessageApi({
      sender: "user",
      kind: "file",
      content: fileMessage,
    });

    if (result.ok && result.data) {
      setChatMessages((current) => [...current, result.data!]);
    } else {
      setChatMessages((current) => [
        ...current,
        {
          id: Date.now(),
          sender: "system",
          kind: "text",
          content: result.message,
          time: getNowTime(),
        },
      ]);
    }
    setChatFileInputKey((current) => current + 1);
    sendBotMessage("anexo");
  }

  async function handleSendVoiceMessage() {
    const result = await sendChatMessageApi({
      sender: "user",
      kind: "audio",
      content: "Mensagem de voz enviada (simulação).",
    });
    if (result.ok && result.data) {
      setChatMessages((current) => [...current, result.data!]);
    } else {
      setChatMessages((current) => [
        ...current,
        {
          id: Date.now(),
          sender: "system",
          kind: "text",
          content: result.message,
          time: getNowTime(),
        },
      ]);
    }
    sendBotMessage("audio");
  }

  function openEditAppointment(appointment: Appointment) {
    setEditingAppointmentId(appointment.id);
    setNewAppointment({
      date: appointment.date,
      time: appointment.time,
      doctor: appointment.doctor,
      specialty: appointment.specialty,
      type: appointment.type,
      status: appointment.status,
    });
    setIsScheduleOpen(true);
  }

  async function handleDeleteAppointment(appointmentId: number) {
    const result = await deleteAppointment(appointmentId);
    if (result.ok) {
      setAppointments((current) => current.filter((item) => item.id !== appointmentId));
    }
  }

  function openEditReminder(reminder: Reminder) {
    setEditingReminderId(reminder.id);
    setNewReminder({
      title: reminder.title,
      message: reminder.message,
      date: reminder.date,
      category: reminder.category,
      endDate: reminder.endDate ?? "",
    });
    setIsNewReminderOpen(true);
  }

  async function handleDeleteReminder(reminderId: number) {
    const result = await deleteReminder(reminderId);
    if (result.ok) {
      setReminders((current) => current.filter((item) => item.id !== reminderId));
    }
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h2 className="dashboard-brand">SAÚDE SAUDÁVEL</h2>
          <p className="dashboard-brand-subtitle">Sua Comodidade, Nossa Prioridade</p>
        </div>
        <button
          type="button"
          className="dashboard-user-icon"
          onClick={() => setIsProfileOpen(true)}
          aria-label="Abrir informações do usuário"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 19c0-3.2 2.9-5.2 7-5.2s7 2 7 5.2" />
          </svg>
        </button>
      </header>
      <section className="dashboard-hero" aria-label="Dashboard do usuário">
        {activePanel === "home" ? <h1 className="dashboard-title">SAÚDE SAUDÁVEL</h1> : null}
        {activePanel === "home" ? (
          <p className="dashboard-subtitle">Sua Comodidade, Nossa Prioridade - Simples, Fácil e Rápido</p>
        ) : null}
        {user ? (
          <>
            {activePanel === "home" ? (
              <>
                <p className="dashboard-meta">
                  Bem-vindo(a), <strong>{user.name}</strong> | {user.email}
                </p>
                <div className="dashboard-grid">
                  {serviceCards.map((card) => (
                    <article key={card.title} className="dashboard-item" onClick={() => handleCardClick(card.title)}>
                      <span className="dashboard-item-icon">{card.icon}</span>
                      <h3 className="dashboard-item-title">{card.title}</h3>
                    </article>
                  ))}
                </div>
                <p className="dashboard-callout">Conheça nossos serviços completos.</p>
                <p className="dashboard-callout-subtitle">Venha nos visitar e cuide do seu bem-estar.</p>
                {user.isAdmin ? (
                  <button type="button" className="dashboard-admin" onClick={() => navigate("/admin")}>
                    Abrir Painel Administrativo
                  </button>
                ) : null}
                <button type="button" className="dashboard-logout" onClick={handleLogout}>
                  Sair
                </button>
              </>
            ) : null}

            {activePanel === "consultas" ? (
              <section className="consultas-section" aria-label="Área de consultas">
                <div className="consultas-toolbar">
                  <input
                    type="text"
                    className="consultas-search"
                    placeholder="Buscar consultas, médicos..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                  <div className="consultas-filters">
                    <select value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))}>
                      {monthNames.map((month, index) => (
                        <option key={month} value={index}>
                          {month}
                        </option>
                      ))}
                    </select>
                    <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="consultas-timer">
                      Cronômetro
                    </button>
                  </div>
                </div>

                <div className="consultas-banner">Calendário (datas / receitas / retornos / consultas / exames)</div>

                <div className="consultas-content">
                  <article className="consultas-calendar-card">
                    <h3>
                      {monthNames[selectedMonth].toLowerCase()} de {selectedYear}
                    </h3>
                    <div className="calendar-weekdays">
                      {weekDays.map((weekday) => (
                        <span key={weekday}>{weekday}</span>
                      ))}
                    </div>
                    <div className="calendar-grid">
                      {monthDays.map((day, index) => (
                        <div key={`${String(day)}-${index}`} className={`calendar-cell ${!day ? "empty" : ""}`}>
                          {day ? (
                            <button
                              type="button"
                              className={`calendar-day ${appointmentDays.has(day) ? "has-appointment" : ""}`}
                            >
                              {day}
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="consultas-list-card">
                    <h3>Próximas Consultas</h3>
                    <div className="consultas-list">
                      {filteredAppointments.length === 0 ? (
                        <p className="consultas-empty">Nenhuma consulta encontrada para o filtro atual.</p>
                      ) : (
                        filteredAppointments.map((appointment) => (
                          <div key={appointment.id} className="consulta-item">
                            <p className="consulta-date">
                              {formatDateBr(appointment.date)} às {appointment.time}
                            </p>
                            <p className="consulta-doctor">
                              {appointment.doctor} - {appointment.specialty}
                            </p>
                            <div className="consulta-tags">
                              <span className="tag type">{appointment.type}</span>
                              <span className={`tag status ${appointment.status}`}>{appointment.status}</span>
                            </div>
                            <div className="item-actions">
                              <button type="button" onClick={() => openEditAppointment(appointment)}>
                                Editar
                              </button>
                              <button type="button" onClick={() => handleDeleteAppointment(appointment.id)}>
                                Excluir
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <button
                      type="button"
                      className="consultas-add-button"
                      onClick={() => {
                        setEditingAppointmentId(null);
                        setNewAppointment({
                          date: "",
                          time: "",
                          doctor: "",
                          specialty: "",
                          type: "consulta",
                          status: "agendada",
                        });
                        setIsScheduleOpen(true);
                      }}
                    >
                      Agendar Nova Consulta
                    </button>
                    <button type="button" className="consultas-back-button" onClick={() => setActivePanel("home")}>
                      Voltar para o Dashboard
                    </button>
                  </article>
                </div>
              </section>
            ) : null}

            {activePanel === "lembretes" ? (
              <section className="lembretes-section" aria-label="Área de lembretes">
                <article className="lembretes-config-card">
                  <h3>Configurar Avisos de Medicamento</h3>
                  <p>Configure quantos dias antes do fim do medicamento você deseja ser avisado:</p>
                  <div className="lembretes-days">
                    {alertDayOptions.map((days) => (
                      <button
                        key={days}
                        type="button"
                        className={`day-option ${selectedAlertDays === days ? "active" : ""}`}
                        onClick={() => setSelectedAlertDays(days)}
                      >
                        {days} dias
                      </button>
                    ))}
                  </div>
                  <button type="button" className="consultas-add-button" onClick={() => setIsPrescriptionOpen(true)}>
                    + Solicitar Nova Receita
                  </button>
                </article>

                <div className="lembretes-header">
                  <h3>Lembretes Ativos ({reminders.length})</h3>
                  <button
                    type="button"
                    className="lembretes-new-button"
                    onClick={() => {
                      setEditingReminderId(null);
                      setNewReminder({ title: "", message: "", date: "", category: "medicamento", endDate: "" });
                      setIsNewReminderOpen(true);
                    }}
                  >
                    + Novo Lembrete
                  </button>
                </div>

                {reminderFeedback ? <p className="auth-feedback lembretes-feedback">{reminderFeedback}</p> : null}

                <div className="lembretes-list">
                  {reminders.map((reminder) => {
                    const daysUntilEnd = reminder.endDate ? getDaysUntil(reminder.endDate) : null;
                    const isUrgent = daysUntilEnd !== null && daysUntilEnd <= selectedAlertDays;
                    return (
                      <article key={reminder.id} className={`lembrete-item ${isUrgent ? "urgent" : ""}`}>
                        <div className="lembrete-top">
                          <h4>{reminder.title}</h4>
                          <span>Hoje</span>
                        </div>
                        <p>{reminder.message}</p>
                        <div className="lembrete-tags">
                          <span>{formatDateBr(reminder.date)}</span>
                          <span className="tag type">{reminder.category}</span>
                          {isUrgent ? <span className="tag status pendente">urgente</span> : null}
                        </div>
                        <div className="item-actions">
                          <button type="button" onClick={() => openEditReminder(reminder)}>
                            Editar
                          </button>
                          <button type="button" onClick={() => handleDeleteReminder(reminder.id)}>
                            Excluir
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <button type="button" className="consultas-back-button" onClick={() => setActivePanel("home")}>
                  Voltar para o Dashboard
                </button>
              </section>
            ) : null}

            {activePanel === "chat" ? (
              <section className="chat-section" aria-label="Área de bate-papo">
                <article className="chat-card">
                  <header className="chat-header">
                    <h3>Chat Saúde Saudável</h3>
                    <span className="chat-online">Online</span>
                  </header>

                  <div className="chat-messages">
                    {chatMessages.map((message) => (
                      <article key={message.id} className={`chat-bubble ${message.sender}`}>
                        <p>{message.content}</p>
                        <span>{message.time}</span>
                      </article>
                    ))}
                    {isBotTyping ? <p className="chat-typing">Atendente digitando...</p> : null}
                  </div>

                  <div className="chat-ai-banner">
                    Integração com API do ChatGPT será adicionada aqui.
                    <br />
                    Em breve: respostas inteligentes e personalizadas para suas dúvidas de saúde.
                  </div>

                  <form className="chat-input-row" onSubmit={handleSendChatMessage}>
                    <label className="chat-attach">
                      📎
                      <input
                        key={chatFileInputKey}
                        type="file"
                        onChange={handleAttachFile}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      />
                    </label>
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      placeholder="Digite sua mensagem..."
                    />
                    <button type="button" className="chat-voice-btn" onClick={handleSendVoiceMessage}>
                      🎙
                    </button>
                    <button type="submit" className="chat-send-btn">
                      ➤
                    </button>
                  </form>
                </article>

                <div className="chat-features-grid">
                  <button
                    type="button"
                    className="chat-feature-card"
                    onClick={() =>
                      setChatInput("Quero ajuda para tirar dúvidas sobre saúde e recomendações básicas.")
                    }
                  >
                    <h4>Chat Inteligente</h4>
                    <p>Tire suas dúvidas sobre saúde.</p>
                  </button>
                  <button type="button" className="chat-feature-card" onClick={handleSendVoiceMessage}>
                    <h4>Mensagem de Voz</h4>
                    <p>Envie áudios quando preferir.</p>
                  </button>
                  <label className="chat-feature-card attach-feature">
                    <h4>Anexar Arquivos</h4>
                    <p>Compartilhe exames e documentos.</p>
                    <input
                      key={`card-${chatFileInputKey}`}
                      type="file"
                      onChange={handleAttachFile}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                  </label>
                </div>

                <button type="button" className="consultas-back-button" onClick={() => setActivePanel("home")}>
                  Voltar para o Dashboard
                </button>
              </section>
            ) : null}
          </>
        ) : (
          <p className="auth-feedback">{feedback}</p>
        )}
      </section>

      {isProfileOpen && user ? (
        <section className="profile-overlay" aria-label="Informações do usuário">
          <article className="profile-panel">
            <div className="profile-panel-header">
              <h3>Informações Pessoais</h3>
              <button type="button" onClick={() => setIsProfileOpen(false)}>
                Fechar
              </button>
            </div>

            <div className="profile-avatar">Foto</div>

            <div className="profile-grid">
              <div>
                <p className="profile-label">Nome</p>
                <p className="profile-value">{user.name.split(" ")[0] || user.name}</p>
              </div>
              <div>
                <p className="profile-label">Sobrenome</p>
                <p className="profile-value">{user.name.split(" ").slice(1).join(" ") || "-"}</p>
              </div>
              <div>
                <p className="profile-label">Email</p>
                <p className="profile-value">{user.email}</p>
              </div>
              <div>
                <p className="profile-label">Telefone</p>
                <p className="profile-value">(11) 99999-9999</p>
              </div>
              <div>
                <p className="profile-label">CPF</p>
                <p className="profile-value">000.000.000-00</p>
              </div>
              <div>
                <p className="profile-label">Endereço</p>
                <p className="profile-value">Rua Exemplo, 123 - São Paulo</p>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      {isScheduleOpen ? (
        <section className="profile-overlay" aria-label="Agendar consulta">
          <article className="profile-panel">
            <div className="profile-panel-header">
              <h3>{editingAppointmentId ? "Editar Consulta" : "Agendar Nova Consulta"}</h3>
              <button type="button" onClick={() => setIsScheduleOpen(false)}>
                Fechar
              </button>
            </div>
            <form className="schedule-form" onSubmit={handleCreateAppointment}>
              <label>
                Data
                <input
                  type="date"
                  value={newAppointment.date}
                  onChange={(event) => setNewAppointment((current) => ({ ...current, date: event.target.value }))}
                  required
                />
              </label>
              <label>
                Hora
                <input
                  type="time"
                  value={newAppointment.time}
                  onChange={(event) => setNewAppointment((current) => ({ ...current, time: event.target.value }))}
                  required
                />
              </label>
              <label>
                Médico(a)
                <input
                  type="text"
                  placeholder="Dr(a). Nome"
                  value={newAppointment.doctor}
                  onChange={(event) => setNewAppointment((current) => ({ ...current, doctor: event.target.value }))}
                  required
                />
              </label>
              <label>
                Especialidade
                <input
                  type="text"
                  placeholder="Cardiologia, Ortopedia..."
                  value={newAppointment.specialty}
                  onChange={(event) =>
                    setNewAppointment((current) => ({ ...current, specialty: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Tipo
                <select
                  value={newAppointment.type}
                  onChange={(event) =>
                    setNewAppointment((current) => ({ ...current, type: event.target.value as Appointment["type"] }))
                  }
                >
                  <option value="consulta">consulta</option>
                  <option value="retorno">retorno</option>
                  <option value="exame">exame</option>
                </select>
              </label>
              <label>
                Status
                <select
                  value={newAppointment.status}
                  onChange={(event) =>
                    setNewAppointment((current) => ({
                      ...current,
                      status: event.target.value as Appointment["status"],
                    }))
                  }
                >
                  <option value="agendada">agendada</option>
                  <option value="confirmada">confirmada</option>
                  <option value="pendente">pendente</option>
                </select>
              </label>
              <button type="submit" className="consultas-add-button">
                {editingAppointmentId ? "Salvar alterações" : "Salvar agendamento"}
              </button>
            </form>
          </article>
        </section>
      ) : null}

      {isNewReminderOpen ? (
        <section className="profile-overlay" aria-label="Novo lembrete">
          <article className="profile-panel">
            <div className="profile-panel-header">
              <h3>{editingReminderId ? "Editar Lembrete" : "Novo Lembrete"}</h3>
              <button type="button" onClick={() => setIsNewReminderOpen(false)}>
                Fechar
              </button>
            </div>
            <form className="schedule-form" onSubmit={handleCreateReminder}>
              <label>
                Título
                <input
                  type="text"
                  value={newReminder.title}
                  onChange={(event) => setNewReminder((current) => ({ ...current, title: event.target.value }))}
                  required
                />
              </label>
              <label>
                Data
                <input
                  type="date"
                  value={newReminder.date}
                  onChange={(event) => setNewReminder((current) => ({ ...current, date: event.target.value }))}
                  required
                />
              </label>
              <label>
                Categoria
                <select
                  value={newReminder.category}
                  onChange={(event) =>
                    setNewReminder((current) => ({ ...current, category: event.target.value as Reminder["category"] }))
                  }
                >
                  <option value="medicamento">medicamento</option>
                  <option value="especial">especial</option>
                </select>
              </label>
              <label>
                Fim do Medicamento
                <input
                  type="date"
                  value={newReminder.endDate}
                  onChange={(event) => setNewReminder((current) => ({ ...current, endDate: event.target.value }))}
                  disabled={newReminder.category !== "medicamento"}
                />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                Mensagem
                <input
                  type="text"
                  value={newReminder.message}
                  onChange={(event) => setNewReminder((current) => ({ ...current, message: event.target.value }))}
                  required
                />
              </label>
              <button type="submit" className="consultas-add-button">
                {editingReminderId ? "Salvar alterações" : "Salvar lembrete"}
              </button>
            </form>
          </article>
        </section>
      ) : null}

      {isPrescriptionOpen ? (
        <section className="profile-overlay" aria-label="Solicitar nova receita">
          <article className="profile-panel">
            <div className="profile-panel-header">
              <h3>Solicitar Nova Receita</h3>
              <button type="button" onClick={() => setIsPrescriptionOpen(false)}>
                Fechar
              </button>
            </div>
            <form className="schedule-form" onSubmit={handleRequestPrescription}>
              <label>
                Medicamento
                <input
                  type="text"
                  value={prescriptionRequest.medicine}
                  onChange={(event) =>
                    setPrescriptionRequest((current) => ({ ...current, medicine: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Detalhes
                <input
                  type="text"
                  value={prescriptionRequest.details}
                  onChange={(event) =>
                    setPrescriptionRequest((current) => ({ ...current, details: event.target.value }))
                  }
                />
              </label>
              <button type="submit" className="consultas-add-button">
                Enviar solicitação
              </button>
            </form>
          </article>
        </section>
      ) : null}
    </main>
  );
}
