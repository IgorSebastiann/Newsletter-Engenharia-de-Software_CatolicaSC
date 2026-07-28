const typeConfig = {
  todos: { label: "Todos", className: "" },
  aula: { label: "Aulas", className: "pill--class" },
  prova: { label: "Provas", className: "pill--exam" },
  feriado: { label: "Feriados", className: "pill--holiday" },
  aviso: { label: "Avisos", className: "pill--notice" }
};

const timelineEl = document.getElementById("timeline");
const noticesEl = document.getElementById("notices-list");
const newsEl = document.getElementById("news-list");
const linksEl = document.getElementById("links-list");
const filtersEl = document.getElementById("filters");
const lastUpdatedEl = document.getElementById("last-updated");

const today = new Date();
today.setHours(0, 0, 0, 0);

let activeFilter = "todos";
let data = null;

function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

function formatLongDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(parseDate(value));
}

function formatCardDate(value) {
  const date = parseDate(value);
  return {
    day: new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(date)
  };
}

function normalizeEvents() {
  return [...data.events].sort((a, b) => a.date.localeCompare(b.date));
}

function getUpcomingEvents() {
  return normalizeEvents().filter((event) => parseDate(event.date) >= today);
}

function renderHighlight() {
  const nextEvent = getUpcomingEvents()[0] || data.events[0];
  document.getElementById("highlight-title").textContent = nextEvent?.title || "Sem eventos";
  document.getElementById("highlight-description").textContent =
    nextEvent?.description || "Adicione eventos no painel do admin.";
  document.getElementById("highlight-date").textContent = nextEvent
    ? formatLongDate(nextEvent.date)
    : "Sem data";
  document.getElementById("highlight-tag").textContent =
    typeConfig[nextEvent?.type]?.label || "Geral";
}

function renderMetrics() {
  const upcoming = getUpcomingEvents();
  const countByType = (type) => upcoming.filter((event) => event.type === type).length;

  document.getElementById("metric-classes").textContent = countByType("aula");
  document.getElementById("metric-exams").textContent = countByType("prova");
  document.getElementById("metric-notices").textContent = countByType("aviso") + data.notices.length;
  document.getElementById("metric-holidays").textContent = countByType("feriado");
}

function renderLastUpdated() {
  lastUpdatedEl.textContent = data?.lastUpdated ? formatLongDate(data.lastUpdated) : "Não informado";
}

function renderFilters() {
  filtersEl.innerHTML = "";

  Object.entries(typeConfig).forEach(([key, config]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-button ${key === activeFilter ? "is-active" : ""}`;
    button.textContent = config.label;
    button.addEventListener("click", () => {
      activeFilter = key;
      renderFilters();
      renderTimeline();
    });
    filtersEl.appendChild(button);
  });
}

function renderTimeline() {
  const upcoming = getUpcomingEvents();
  const filtered =
    activeFilter === "todos"
      ? upcoming
      : upcoming.filter((event) => event.type === activeFilter);

  if (!filtered.length) {
    timelineEl.innerHTML = '<div class="empty-state">Nenhum evento encontrado para este filtro.</div>';
    return;
  }

  timelineEl.innerHTML = filtered
    .map((event) => {
      const { day, month } = formatCardDate(event.date);
      const type = typeConfig[event.type] || typeConfig.todos;

      return `
        <article class="timeline-card">
          <div class="timeline-card__date">
            <span class="timeline-card__day">${day}</span>
            <span class="timeline-card__month">${month}</span>
          </div>
          <div class="timeline-card__content">
            <span class="tag ${type.className}">${type.label}</span>
            <h3>${event.title}</h3>
            <p>${event.description}</p>
            <div class="timeline-card__meta">
              <span>${formatLongDate(event.date)}</span>
              ${event.time ? `<span>${event.time}</span>` : ""}
              ${event.location ? `<span>${event.location}</span>` : ""}
              ${event.teacher ? `<span>${event.teacher}</span>` : ""}
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderNotices() {
  noticesEl.innerHTML = [...data.notices]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(
      (notice) => `
        <article class="notice-card">
          <span class="tag pill--notice">Aviso</span>
          <h3>${notice.title}</h3>
          <p>${notice.description}</p>
          <div class="notice-card__meta">
            <span>${notice.author}</span>
            <span>${formatLongDate(notice.date)}</span>
            <span>Prioridade: ${notice.priority}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderNews() {
  newsEl.innerHTML = [...data.news]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(
      (item) => `
        <article class="news-card">
          <span class="tag">${item.category}</span>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
          <div class="timeline-card__meta">
            <span>${formatLongDate(item.date)}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderLinks() {
  linksEl.innerHTML = data.links
    .map(
      (link) => `
        <a class="link-card" href="${link.url}" target="_blank" rel="noreferrer">
          <div>
            <strong>${link.title}</strong>
            <p>${link.description}</p>
          </div>
          <span class="tag">Abrir</span>
        </a>
      `
    )
    .join("");
}

function renderAll() {
  renderHighlight();
  renderMetrics();
  renderLastUpdated();
  renderFilters();
  renderTimeline();
  renderNotices();
  renderNews();
  renderLinks();
}

function renderErrorState() {
  const message = '<div class="empty-state">Não foi possível carregar o conteúdo da newsletter.</div>';
  timelineEl.innerHTML = message;
  noticesEl.innerHTML = message;
  newsEl.innerHTML = message;
  linksEl.innerHTML = message;
  lastUpdatedEl.textContent = "Erro ao carregar";
}

async function loadData() {
  try {
    const response = await fetch("./content/site.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Falha ao carregar conteúdo: ${response.status}`);
    }

    data = await response.json();
    renderAll();
  } catch (error) {
    console.error(error);
    renderErrorState();
  }
}

loadData();
