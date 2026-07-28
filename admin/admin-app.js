import React, { useEffect, useMemo, useState, startTransition } from "react";
import { createRoot } from "react-dom/client";
import { html } from "htm/react";
import {
  addDays,
  buildItemsForDate,
  ensureDataShape,
  formatIsoDate,
  formatLongDate,
  formatMonthLabel,
  parseDate,
  weekdayName,
} from "../app/shared/site-data.js";

function AdminApp() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Carregando painel...");
  const [loginError, setLoginError] = useState("");
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [data, setData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(formatIsoDate(new Date()));
  const [calendarCursor, setCalendarCursor] = useState(new Date());

  useEffect(() => {
    checkSession();
  }, []);

  async function request(url, options = {}) {
    const headers = new Headers(options.headers || {});

    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "same-origin",
    });

    if (!response.ok) {
      let message = "Nao foi possivel concluir a solicitacao.";

      try {
        const payload = await response.json();
        message = payload.error || message;
      } catch (error) {
        message = (await response.text()) || message;
      }

      throw new Error(message);
    }

    const contentType = response.headers.get("content-type") || "";
    return contentType.includes("application/json") ? response.json() : null;
  }

  async function checkSession() {
    try {
      const result = await request("/api/admin-session");
      if (!result?.authenticated) {
        setAuthenticated(false);
        setStatus("Sessao encerrada.");
        setLoading(false);
        return;
      }

      await loadContent();
      setAuthenticated(true);
      setStatus("Painel pronto para edicao.");
    } catch (error) {
      setAuthenticated(false);
      setStatus("Sessao encerrada.");
    } finally {
      setLoading(false);
    }
  }

  async function loadContent() {
    const result = await request("/api/admin-content");
    const payload = ensureDataShape(result.content || {});

    startTransition(() => {
      setData(payload);
      setSelectedDate(payload.semesterStart || formatIsoDate(new Date()));
      const start = parseDate(payload.semesterStart) || new Date();
      setCalendarCursor(new Date(start.getFullYear(), start.getMonth(), 1));
    });
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoginError("");

    try {
      await request("/api/admin-login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });

      setCredentials({ username: "", password: "" });
      await loadContent();
      setAuthenticated(true);
      setStatus("Painel pronto para edicao.");
    } catch (error) {
      setLoginError(error.message);
    }
  }

  async function handleLogout() {
    try {
      await request("/api/admin-logout", { method: "POST" });
    } catch (error) {
      // Keep local logout even if the network request fails.
    }

    setAuthenticated(false);
    setData(null);
    setStatus("Sessao encerrada.");
  }

  async function handleSave() {
    if (!data || saving) {
      return;
    }

    const payload = {
      ...data,
      lastUpdated: formatIsoDate(new Date()),
    };

    setSaving(true);
    setStatus("Salvando alteracoes...");

    try {
      await request("/api/admin-content", {
        method: "PUT",
        body: JSON.stringify({ content: payload }),
      });
      setData(payload);
      setStatus("Conteudo salvo com sucesso.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  }

  function updateField(key, value) {
    setData((current) => ({ ...current, [key]: value }));
  }

  function updateListItem(listName, index, key, value) {
    setData((current) => {
      const next = { ...current };
      next[listName] = [...next[listName]];
      next[listName][index] = { ...next[listName][index], [key]: value };
      return next;
    });
  }

  function addLink() {
    setData((current) => ({
      ...current,
      links: [...current.links, { title: "", description: "", url: "" }],
    }));
  }

  function removeLink(index) {
    setData((current) => ({
      ...current,
      links: current.links.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function addWeeklyClass() {
    setData((current) => ({
      ...current,
      weeklyClasses: [
        ...current.weeklyClasses,
        {
          title: "",
          teacher: "",
          weekday: 1,
          time: "",
          location: "",
          description: "",
          startDate: current.semesterStart,
          endDate: current.semesterEnd,
          frequency: "weekly",
          type: "aula",
        },
      ],
    }));
  }

  function removeWeeklyClass(index) {
    setData((current) => ({
      ...current,
      weeklyClasses: current.weeklyClasses.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function addNotice(date = selectedDate) {
    setData((current) => ({
      ...current,
      notices: [{ title: "", description: "", date }, ...current.notices],
    }));
  }

  function removeNotice(index) {
    setData((current) => ({
      ...current,
      notices: current.notices.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function addEvent(date = selectedDate) {
    setData((current) => ({
      ...current,
      events: [{ title: "", description: "", date, time: "", type: "aviso" }, ...current.events],
    }));
  }

  function removeEvent(index) {
    setData((current) => ({
      ...current,
      events: current.events.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  const selectedDay = useMemo(() => {
    if (!data) {
      return { events: [], notices: [], count: 0 };
    }

    return buildItemsForDate(data, selectedDate);
  }, [data, selectedDate]);

  if (loading) {
    return html`<main className="admin-page"><div className="empty-state">Carregando painel...</div></main>`;
  }

  if (!authenticated) {
    return html`
      <main className="admin-page">
        <header className="admin-header">
          <div className="admin-header__copy">
            <p className="eyebrow">Painel editorial</p>
            <h1>Radar da turma</h1>
            <p>Agenda, avisos e links agora vivem em uma interface React focada em calendario.</p>
          </div>
          <a href="/" className="header-link">Voltar ao site</a>
        </header>

        <section className="login-layout">
          <aside className="login-box">
            <p className="eyebrow">Acesso privado</p>
            <strong>Entrar no painel</strong>
            <p>Use seu login para editar o calendario e os recados exibidos no site.</p>
          </aside>

          <section className="login-panel">
            <p className="eyebrow">Entrar</p>
            <h2>Login do administrador</h2>
            <form className="login-form" onSubmit=${handleLogin}>
              <label>
                <span>Usuario</span>
                <input
                  type="text"
                  value=${credentials.username}
                  onInput=${(event) => setCredentials((current) => ({ ...current, username: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Senha</span>
                <input
                  type="password"
                  value=${credentials.password}
                  onInput=${(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
                  required
                />
              </label>
              <button type="submit">Entrar</button>
              <p className="feedback">${loginError || status}</p>
            </form>
          </section>
        </section>
      </main>
    `;
  }

  return html`
    <main className="admin-page">
      <header className="admin-header">
        <div className="admin-header__copy">
          <p className="eyebrow">Painel editorial</p>
          <h1>Radar da turma</h1>
          <p>Edite o semestre, os links e o que aparece em cada dia do calendario.</p>
        </div>
        <a href="/" className="header-link">Voltar ao site</a>
      </header>

      <div className="toolbar">
        <div className="toolbar__status">
          <p className="eyebrow">Status</p>
          <strong>${status}</strong>
          <span>${formatLongDate(selectedDate)} | ${selectedDay.count} item${selectedDay.count === 1 ? "" : "s"}</span>
        </div>
        <div className="toolbar__actions">
          <button className="button button--ghost" type="button" onClick=${handleLogout}>Sair</button>
          <button className="button button--solid" type="button" disabled=${saving} onClick=${handleSave}>
            ${saving ? "Salvando..." : "Salvar alteracoes"}
          </button>
        </div>
      </div>

      <div className="editor-shell">
        <div className="editor-root">
          <section className="editor-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Configuracoes gerais</p>
                <h2>Identidade do mural</h2>
              </div>
            </div>
            <div className="field-grid field-grid--two">
              <label className="field">
                <span>Nome da turma</span>
                <input type="text" value=${data.className} onInput=${(event) => updateField("className", event.target.value)} />
              </label>
              <label className="field">
                <span>Ultima atualizacao</span>
                <input type="date" value=${data.lastUpdated} onInput=${(event) => updateField("lastUpdated", event.target.value)} />
              </label>
              <label className="field">
                <span>Inicio do semestre</span>
                <input type="date" value=${data.semesterStart} onInput=${(event) => updateField("semesterStart", event.target.value)} />
              </label>
              <label className="field">
                <span>Fim do semestre</span>
                <input type="date" value=${data.semesterEnd} onInput=${(event) => updateField("semesterEnd", event.target.value)} />
              </label>
            </div>
          </section>

          <section className="editor-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Acesso rapido</p>
                <h2>Links importantes</h2>
              </div>
              <button className="button button--ghost" type="button" onClick=${addLink}>Adicionar link</button>
            </div>
            <div className="stack-list">
              ${data.links.map(
                (link, index) => html`
                  <article className="editor-item" key=${`link-${index}`}>
                    <label className="field">
                      <span>Titulo</span>
                      <input type="text" value=${link.title || link.label || ""} onInput=${(event) => updateListItem("links", index, "title", event.target.value)} />
                    </label>
                    <label className="field">
                      <span>Descricao</span>
                      <input type="text" value=${link.description || ""} onInput=${(event) => updateListItem("links", index, "description", event.target.value)} />
                    </label>
                    <label className="field">
                      <span>URL</span>
                      <input type="url" value=${link.url || ""} onInput=${(event) => updateListItem("links", index, "url", event.target.value)} />
                    </label>
                    <div className="editor-item__actions">
                      <button className="remove-button" type="button" onClick=${() => removeLink(index)}>Remover</button>
                    </div>
                  </article>
                `
              )}
            </div>
          </section>

          <section className="editor-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Rotina semanal</p>
                <h2>Aulas recorrentes</h2>
              </div>
              <button className="button button--ghost" type="button" onClick=${addWeeklyClass}>Nova aula</button>
            </div>
            <div className="stack-list">
              ${data.weeklyClasses.map(
                (item, index) => html`
                  <article className="editor-item" key=${`weekly-${index}`}>
                    <div className="list-card-header">
                      <span className="modal-badge">${weekdayName(Number(item.weekday))}</span>
                      <button className="remove-button" type="button" onClick=${() => removeWeeklyClass(index)}>Remover</button>
                    </div>
                    <div className="field-grid field-grid--two">
                      <label className="field">
                        <span>Disciplina</span>
                        <input type="text" value=${item.title || ""} onInput=${(event) => updateListItem("weeklyClasses", index, "title", event.target.value)} />
                      </label>
                      <label className="field">
                        <span>Professor</span>
                        <input type="text" value=${item.teacher || ""} onInput=${(event) => updateListItem("weeklyClasses", index, "teacher", event.target.value)} />
                      </label>
                      <label className="field">
                        <span>Dia da semana</span>
                        <select value=${Number(item.weekday)} onInput=${(event) => updateListItem("weeklyClasses", index, "weekday", Number(event.target.value))}>
                          ${[0, 1, 2, 3, 4, 5, 6].map((day) => html`<option value=${day} key=${day}>${weekdayName(day)}</option>`)}
                        </select>
                      </label>
                      <label className="field">
                        <span>Horario</span>
                        <input type="text" value=${item.time || ""} onInput=${(event) => updateListItem("weeklyClasses", index, "time", event.target.value)} />
                      </label>
                      <label className="field">
                        <span>Sala</span>
                        <input type="text" value=${item.location || ""} onInput=${(event) => updateListItem("weeklyClasses", index, "location", event.target.value)} />
                      </label>
                      <label className="field">
                        <span>Inicio</span>
                        <input type="date" value=${item.startDate || ""} onInput=${(event) => updateListItem("weeklyClasses", index, "startDate", event.target.value)} />
                      </label>
                      <label className="field">
                        <span>Fim</span>
                        <input type="date" value=${item.endDate || ""} onInput=${(event) => updateListItem("weeklyClasses", index, "endDate", event.target.value)} />
                      </label>
                      <label className="field">
                        <span>Frequencia</span>
                        <select value=${item.frequency || "weekly"} onInput=${(event) => updateListItem("weeklyClasses", index, "frequency", event.target.value)}>
                          <option value="weekly">Semanal</option>
                          <option value="biweekly">Quinzenal</option>
                        </select>
                      </label>
                    </div>
                    <label className="field">
                      <span>Observacoes</span>
                      <textarea rows="2" value=${item.description || ""} onInput=${(event) => updateListItem("weeklyClasses", index, "description", event.target.value)}></textarea>
                    </label>
                  </article>
                `
              )}
            </div>
          </section>

          <section className="calendar-stage">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Agenda</p>
                <h2>Calendario do semestre</h2>
              </div>
              <div className="calendar-nav">
                <button className="calendar-toolbar__button" type="button" onClick=${() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1))}>&lt;</button>
                <strong>${formatMonthLabel(calendarCursor)}</strong>
                <button className="calendar-toolbar__button" type="button" onClick=${() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1))}>&gt;</button>
              </div>
            </div>
            <p className="helper-copy">Clique em um dia para editar somente o que pertence a ele.</p>
            <${AdminCalendarGrid}
              data=${data}
              calendarCursor=${calendarCursor}
              selectedDate=${selectedDate}
              onSelectDate=${setSelectedDate}
            />
          </section>

          <section className="editor-card editor-card--full">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Dia selecionado</p>
                <h2>${formatLongDate(selectedDate)}</h2>
              </div>
              <div className="toolbar__actions">
                <button className="button button--ghost" type="button" onClick=${() => addEvent(selectedDate)}>Novo evento</button>
                <button className="button button--ghost" type="button" onClick=${() => addNotice(selectedDate)}>Novo aviso</button>
              </div>
            </div>

            <div className="day-panel__content">
              <section className="modal-section">
                <div className="section-title-row">
                  <h3>Eventos do dia</h3>
                  <span className="modal-badge">${selectedDay.events.length}</span>
                </div>
                ${selectedDay.events.length
                  ? selectedDay.events.map(
                      (event, index) => html`
                        <article className="modal-item" key=${`event-${index}`}>
                          <div className="list-card-header">
                            <span className="modal-badge">${event.recurring ? "Aula recorrente" : "Evento manual"}</span>
                            ${event.recurring
                              ? null
                              : html`<button className="remove-button" type="button" onClick=${() => removeEvent(data.events.findIndex((item) => item === event))}>Remover</button>`}
                          </div>
                          <label className="field">
                            <span>Titulo</span>
                            ${event.recurring
                              ? html`<input type="text" value=${event.title || ""} disabled />`
                              : html`<input type="text" value=${event.title || ""} onInput=${(e) => updateListItem("events", data.events.findIndex((item) => item === event), "title", e.target.value)} />`}
                          </label>
                          <div className="field-grid field-grid--two">
                            <label className="field">
                              <span>Data</span>
                              ${event.recurring
                                ? html`<input type="date" value=${event.date || ""} disabled />`
                                : html`<input type="date" value=${event.date || ""} onInput=${(e) => updateListItem("events", data.events.findIndex((item) => item === event), "date", e.target.value)} />`}
                            </label>
                            <label className="field">
                              <span>Horario</span>
                              ${event.recurring
                                ? html`<input type="text" value=${event.time || ""} disabled />`
                                : html`<input type="text" value=${event.time || ""} onInput=${(e) => updateListItem("events", data.events.findIndex((item) => item === event), "time", e.target.value)} />`}
                            </label>
                          </div>
                          <label className="field">
                            <span>Descricao</span>
                            ${event.recurring
                              ? html`<textarea rows="3" value=${event.description || ""} disabled></textarea>`
                              : html`<textarea rows="3" value=${event.description || ""} onInput=${(e) => updateListItem("events", data.events.findIndex((item) => item === event), "description", e.target.value)}></textarea>`}
                          </label>
                        </article>
                      `
                    )
                  : html`<div className="empty-state">Nenhum evento para esta data.</div>`}
              </section>

              <section className="modal-section">
                <div className="section-title-row">
                  <h3>Avisos do dia</h3>
                  <span className="modal-badge">${selectedDay.notices.length}</span>
                </div>
                ${selectedDay.notices.length
                  ? selectedDay.notices.map((notice) => {
                      const originalIndex = data.notices.findIndex((item) => item === notice);
                      return html`
                        <article className="modal-item" key=${`notice-${originalIndex}`}>
                          <div className="list-card-header">
                            <span className="modal-badge">Aviso</span>
                            <button className="remove-button" type="button" onClick=${() => removeNotice(originalIndex)}>Remover</button>
                          </div>
                          <label className="field">
                            <span>Titulo</span>
                            <input type="text" value=${notice.title || ""} onInput=${(event) => updateListItem("notices", originalIndex, "title", event.target.value)} />
                          </label>
                          <label className="field">
                            <span>Descricao</span>
                            <textarea rows="3" value=${notice.description || ""} onInput=${(event) => updateListItem("notices", originalIndex, "description", event.target.value)}></textarea>
                          </label>
                        </article>
                      `;
                    })
                  : html`<div className="empty-state">Nenhum aviso para esta data.</div>`}
              </section>
            </div>
          </section>
        </div>
      </div>
    </main>
  `;
}

function AdminCalendarGrid({ data, calendarCursor, selectedDate, onSelectDate }) {
  const monthStart = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const date = addDays(gridStart, index);
    const iso = formatIsoDate(date);
    const items = buildItemsForDate(data, iso);
    cells.push({ iso, date, ...items });
  }

  return html`
    <div className="calendar-wrap">
      <div className="calendar-grid">
        ${weekdays.map((label) => html`<span className="calendar-weekday" key=${label}>${label}</span>`)}
        ${cells.map((cell) => {
          const isOutside = cell.date.getMonth() !== calendarCursor.getMonth();
          const isToday = cell.iso === formatIsoDate(new Date());
          const isSelected = cell.iso === selectedDate;
          const preview = cell.events[0]?.title || cell.notices[0]?.title || "Livre";

          return html`
            <button
              key=${cell.iso}
              type="button"
              className=${`calendar-day ${isOutside ? "is-outside" : ""} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}`}
              onClick=${() => onSelectDate(cell.iso)}
            >
              <div className="calendar-day__top">
                <span className="calendar-day__number">${cell.date.getDate()}</span>
                <span className="calendar-day__count">${cell.count ? `${cell.count} item${cell.count === 1 ? "" : "s"}` : "Livre"}</span>
              </div>
              <div className="calendar-day__dots">
                ${cell.events.some((event) => event.type === "aula") ? html`<span className="calendar-dot calendar-dot--aula"></span>` : null}
                ${cell.events.some((event) => event.type === "prova") ? html`<span className="calendar-dot calendar-dot--prova"></span>` : null}
                ${cell.notices.length ? html`<span className="calendar-dot calendar-dot--aviso"></span>` : null}
              </div>
              <div className="calendar-day__text">${preview}</div>
            </button>
          `;
        })}
      </div>
    </div>
  `;
}

createRoot(document.getElementById("root")).render(html`<${AdminApp} />`);
