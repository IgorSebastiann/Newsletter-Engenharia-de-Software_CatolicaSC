import React, { useEffect, useMemo, useState, startTransition } from "https://esm.sh/react@18";
import { createRoot } from "https://esm.sh/react-dom@18/client";
import htm from "https://esm.sh/htm@3/react";
import {
  addDays,
  buildItemsForDate,
  ensureDataShape,
  formatIsoDate,
  formatLongDate,
  formatMonthLabel,
  normalizeEvents,
  parseDate,
  typeConfig,
} from "./shared/site-data.js";

const html = htm.bind(React.createElement);

function PublicApp() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const response = await fetch("./content/site.json", { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Falha ao carregar conteudo: ${response.status}`);
        }

        const payload = ensureDataShape(await response.json());
        if (!active) {
          return;
        }

        startTransition(() => {
          setData(payload);
          setSelectedDate(payload.semesterStart || formatIsoDate(new Date()));
          const start = parseDate(payload.semesterStart) || new Date();
          setCalendarCursor(new Date(start.getFullYear(), start.getMonth(), 1));
          setError("");
        });
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError.message);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const normalizedEvents = useMemo(() => (data ? normalizeEvents(data) : []), [data]);

  const nextEvent = useMemo(() => {
    if (!data) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return normalizedEvents.find((event) => {
      const eventDate = parseDate(event.date);
      return eventDate && eventDate >= today;
    }) || normalizedEvents[0] || null;
  }, [data, normalizedEvents]);

  const selectedDay = useMemo(() => {
    if (!data || !selectedDate) {
      return { events: [], notices: [], count: 0 };
    }

    return buildItemsForDate(data, selectedDate);
  }, [data, selectedDate]);

  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = normalizedEvents.filter((event) => {
      const eventDate = parseDate(event.date);
      return eventDate && eventDate >= today;
    });

    const countByType = (type) => upcoming.filter((event) => event.type === type).length;

    return {
      classes: countByType("aula"),
      exams: countByType("prova"),
      notices: countByType("aviso") + (data?.notices?.length || 0),
      holidays: countByType("feriado"),
    };
  }, [data, normalizedEvents]);

  if (error) {
    return html`
      <main className="page">
        <div className="empty-state">Nao foi possivel carregar o conteudo da newsletter.</div>
      </main>
    `;
  }

  if (!data) {
    return html`
      <main className="page">
        <div className="empty-state">Carregando agenda...</div>
      </main>
    `;
  }

  return html`
    <main id="home" className="page">
      <header className="site-header">
        <a href="#home" className="brand">
          <span className="brand__dot"></span>
          <span>Radar da Turma</span>
        </a>

        <nav className="site-nav">
          <a href="#agenda">Agenda</a>
          <a href="#avisos">Avisos</a>
          <a href="#links">Links</a>
          <a href="/admin/" className="site-nav__admin">Admin</a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero__copy">
          <p className="hero__eyebrow">${data.className || "Catolica SC | Engenharia de Software"}</p>
          <h1>Calendario da turma com detalhe so quando o dia importa.</h1>
          <p className="hero__text">
            A agenda agora concentra a visao do semestre inteiro e abre o conteudo completo de cada dia no clique.
          </p>
          <div className="hero__actions">
            <a href="#agenda" className="button button--solid">Abrir agenda</a>
            <a href="#links" className="button button--ghost">Ver links</a>
          </div>
        </div>

        <div className="hero__blocks">
          <article className="info-block info-block--blue">
            <span className="info-block__code">NEXT</span>
            <h2>${nextEvent?.title || "Sem eventos"}</h2>
            <p>${nextEvent?.description || "Adicione eventos no painel do admin."}</p>
          </article>

          <article className="info-block info-block--yellow">
            <span className="info-block__code">DATE</span>
            <strong>${nextEvent ? formatLongDate(nextEvent.date) : "Sem data"}</strong>
            <span>${typeConfig[nextEvent?.type]?.label || "Geral"}</span>
          </article>

          <article className="info-block info-block--dark">
            <span className="info-block__code">SYNC</span>
            <strong>${data.lastUpdated ? formatLongDate(data.lastUpdated) : "Nao informado"}</strong>
            <span>Agenda publica em React</span>
          </article>
        </div>
      </section>

      <section className="metrics">
        <article className="metric">
          <span className="metric__label">Aulas</span>
          <strong>${metrics.classes}</strong>
        </article>
        <article className="metric">
          <span className="metric__label">Provas</span>
          <strong>${metrics.exams}</strong>
        </article>
        <article className="metric">
          <span className="metric__label">Avisos</span>
          <strong>${metrics.notices}</strong>
        </article>
        <article className="metric">
          <span className="metric__label">Feriados</span>
          <strong>${metrics.holidays}</strong>
        </article>
      </section>

      <section className="section-layout" id="agenda">
        <aside className="section-marker section-marker--blue">
          <span>01</span>
          <strong>Agenda</strong>
        </aside>
        <div className="section-body">
          <div className="section-heading">
            <div>
              <p className="section-heading__eyebrow">Visao do semestre</p>
              <h2>Agenda da turma</h2>
            </div>
            <p>Clique em um dia do calendario para abrir aulas, avisos e anotacoes daquela data.</p>
          </div>

          <div className="calendar-panel">
            <div className="calendar-panel__header">
              <div>
                <p className="section-heading__eyebrow">Calendario</p>
                <h3>${formatMonthLabel(calendarCursor)}</h3>
              </div>
              <div className="calendar-nav">
                <button
                  type="button"
                  className="filter-button"
                  onClick=${() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1))}
                >
                  Mes anterior
                </button>
                <button
                  type="button"
                  className="filter-button"
                  onClick=${() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1))}
                >
                  Proximo mes
                </button>
              </div>
            </div>

            <${CalendarGrid}
              data=${data}
              calendarCursor=${calendarCursor}
              selectedDate=${selectedDate}
              onSelectDate=${setSelectedDate}
            />
          </div>

          <${DayPanel} selectedDate=${selectedDate} selectedDay=${selectedDay} />
        </div>
      </section>

      <section className="section-layout" id="avisos">
        <aside className="section-marker section-marker--red">
          <span>02</span>
          <strong>Avisos</strong>
        </aside>
        <div className="section-body">
          <div className="section-heading">
            <div>
              <p className="section-heading__eyebrow">Canal interno</p>
              <h2>Recados rapidos</h2>
            </div>
            <p>Mensagens importantes continuam visiveis fora do calendario para consulta rapida.</p>
          </div>
          <div className="stack">
            ${(data.notices || []).length
              ? [...data.notices]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(
                    (notice) => html`
                      <article className="notice-card" key=${`${notice.title}-${notice.date}`}>
                        <span className="tag pill--notice">Aviso</span>
                        <h3>${notice.title}</h3>
                        <p>${notice.description}</p>
                        <div className="notice-card__meta">
                          ${notice.author ? html`<span>${notice.author}</span>` : null}
                          <span>${formatLongDate(notice.date)}</span>
                          ${notice.priority ? html`<span>Prioridade: ${notice.priority}</span>` : null}
                        </div>
                      </article>
                    `
                  )
              : html`<div className="empty-state">Nenhum aviso geral cadastrado.</div>`}
          </div>
        </div>
      </section>

      <section className="section-layout" id="links">
        <aside className="section-marker section-marker--yellow">
          <span>03</span>
          <strong>Links</strong>
        </aside>
        <div className="section-body">
          <div className="section-heading">
            <div>
              <p className="section-heading__eyebrow">Atalhos</p>
              <h2>Links uteis</h2>
            </div>
            <p>Os acessos da turma ficam reunidos num bloco simples, sem misturar com a agenda.</p>
          </div>
          <div className="links-grid">
            ${(data.links || []).length
              ? data.links.map(
                  (link, index) => html`
                    <a className="link-card" href=${link.url} target="_blank" rel="noreferrer" key=${`${link.url}-${index}`}>
                      <div>
                        <strong>${link.title || link.label || "Link"}</strong>
                        <p>${link.description || ""}</p>
                      </div>
                      <span className="tag">Abrir</span>
                    </a>
                  `
                )
              : html`<div className="empty-state">Nenhum link cadastrado.</div>`}
          </div>
        </div>
      </section>
    </main>
  `;
}

function CalendarGrid({ data, calendarCursor, selectedDate, onSelectDate }) {
  const monthStart = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const date = addDays(gridStart, index);
    const iso = formatIsoDate(date);
    const items = buildItemsForDate(data, iso);
    cells.push({
      iso,
      date,
      ...items,
    });
  }

  return html`
    <div className="calendar-wrap">
      <div className="calendar-grid">
        ${weekdays.map((label) => html`<span className="calendar-weekday" key=${label}>${label}</span>`)}
        ${cells.map((cell) => {
          const isOutside = cell.date.getMonth() !== calendarCursor.getMonth();
          const isSelected = cell.iso === selectedDate;
          const isToday = cell.iso === formatIsoDate(new Date());
          const preview = cell.events[0]?.title || cell.notices[0]?.title || "Sem informacoes";

          return html`
            <button
              key=${cell.iso}
              type="button"
              className=${`calendar-day ${isOutside ? "is-outside" : ""} ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}`}
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

function DayPanel({ selectedDate, selectedDay }) {
  return html`
    <section className="day-panel">
      <div className="section-heading section-heading--compact">
        <div>
          <p className="section-heading__eyebrow">Detalhe do dia</p>
          <h2>${formatLongDate(selectedDate)}</h2>
        </div>
        <p>${selectedDay.count ? "As informacoes do dia aparecem aqui." : "Nenhum item cadastrado nesta data."}</p>
      </div>

      <div className="day-panel__content">
        ${(selectedDay.events || []).length
          ? selectedDay.events.map(
              (event, index) => html`
                <article className="timeline-card" key=${`${event.title}-${event.date}-${index}`}>
                  <div className="timeline-card__date">
                    <span className="timeline-card__day">${formatLongDate(event.date, { day: "2-digit" })}</span>
                    <span className="timeline-card__month">${typeConfig[event.type]?.label || "Evento"}</span>
                  </div>
                  <div className="timeline-card__content">
                    <span className=${`tag ${typeConfig[event.type]?.className || ""}`}>${typeConfig[event.type]?.label || "Evento"}</span>
                    <h3>${event.title}</h3>
                    <p>${event.description || "Sem descricao."}</p>
                    <div className="timeline-card__meta">
                      ${event.time ? html`<span>${event.time}</span>` : null}
                      ${event.location ? html`<span>${event.location}</span>` : null}
                      ${event.teacher ? html`<span>${event.teacher}</span>` : null}
                      ${event.recurring ? html`<span>Aula recorrente</span>` : null}
                    </div>
                  </div>
                </article>
              `
            )
          : null}

        ${(selectedDay.notices || []).length
          ? selectedDay.notices.map(
              (notice, index) => html`
                <article className="notice-card" key=${`${notice.title}-${notice.date}-${index}`}>
                  <span className="tag pill--notice">Aviso</span>
                  <h3>${notice.title}</h3>
                  <p>${notice.description || "Sem descricao."}</p>
                  <div className="notice-card__meta">
                    <span>${formatLongDate(notice.date)}</span>
                  </div>
                </article>
              `
            )
          : null}

        ${!selectedDay.count ? html`<div className="empty-state">Escolha outro dia ou cadastre novas informacoes no painel do admin.</div>` : null}
      </div>
    </section>
  `;
}

createRoot(document.getElementById("root")).render(html`<${PublicApp} />`);
