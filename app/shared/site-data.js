export const typeConfig = {
  todos: { label: "Todos", className: "" },
  aula: { label: "Aulas", className: "pill--class" },
  prova: { label: "Provas", className: "pill--exam" },
  feriado: { label: "Feriados", className: "pill--holiday" },
  aviso: { label: "Avisos", className: "pill--notice" },
};

export function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatLongDate(value, options = {}) {
  const date = typeof value === "string" ? parseDate(value) : value;
  if (!date) {
    return "Data nao definida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    ...options,
  }).format(date);
}

export function formatMonthLabel(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function weekdayName(day) {
  return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"][day] || "Dia";
}

export function ensureDataShape(data) {
  return {
    className: data.className || "",
    lastUpdated: data.lastUpdated || formatIsoDate(new Date()),
    semesterStart: data.semesterStart || formatIsoDate(new Date()),
    semesterEnd: data.semesterEnd || formatIsoDate(new Date()),
    links: Array.isArray(data.links) ? data.links : [],
    weeklyClasses: Array.isArray(data.weeklyClasses) ? data.weeklyClasses : [],
    notices: Array.isArray(data.notices) ? data.notices : [],
    news: Array.isArray(data.news) ? data.news : [],
    events: Array.isArray(data.events) ? data.events : [],
  };
}

export function buildRecurringEvents(data) {
  const weeklyClasses = Array.isArray(data.weeklyClasses) ? data.weeklyClasses : [];
  const semesterStart = parseDate(data.semesterStart) || new Date();
  const semesterEnd = parseDate(data.semesterEnd) || semesterStart;
  const events = [];

  weeklyClasses.forEach((subject) => {
    if (subject.frequency === "biweekly") {
      let cursor = parseDate(subject.startDate || data.semesterStart);

      if (!cursor) {
        return;
      }

      while (cursor <= semesterEnd) {
        if (cursor >= semesterStart) {
          events.push({
            title: subject.title,
            description: subject.description,
            type: subject.type || "aula",
            date: formatIsoDate(cursor),
            time: subject.time || "",
            location: subject.location || "",
            teacher: subject.teacher || "",
            recurring: true,
          });
        }

        cursor = addDays(cursor, 14);
      }

      return;
    }

    const weekday = Number(subject.weekday);
    let cursor = new Date(semesterStart);
    const diff = (weekday - cursor.getDay() + 7) % 7;
    cursor = addDays(cursor, diff);

    while (cursor <= semesterEnd) {
      const startDate = parseDate(subject.startDate);
      const endDate = parseDate(subject.endDate);

      if ((!startDate || cursor >= startDate) && (!endDate || cursor <= endDate)) {
        events.push({
          title: subject.title,
          description: subject.description,
          type: subject.type || "aula",
          date: formatIsoDate(cursor),
          time: subject.time || "",
          location: subject.location || "",
          teacher: subject.teacher || "",
          recurring: true,
        });
      }

      cursor = addDays(cursor, 7);
    }
  });

  return events;
}

export function normalizeEvents(data) {
  return [...buildRecurringEvents(data), ...(data.events || [])].sort((a, b) => {
    if (a.date === b.date) {
      return (a.time || "").localeCompare(b.time || "");
    }

    return a.date.localeCompare(b.date);
  });
}

export function buildItemsForDate(data, dateString) {
  const dayEvents = normalizeEvents(data).filter((event) => event.date === dateString);
  const dayNotices = (data.notices || []).filter((notice) => notice.date === dateString);

  return {
    events: dayEvents,
    notices: dayNotices,
    count: dayEvents.length + dayNotices.length,
  };
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
