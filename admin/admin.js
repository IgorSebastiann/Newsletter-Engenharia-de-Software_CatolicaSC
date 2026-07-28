const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const loginForm = document.getElementById("login-form");
const loginFeedback = document.getElementById("login-feedback");
const editorRoot = document.getElementById("editor-root");
const saveStatus = document.getElementById("save-status");
const saveButton = document.getElementById("save-button");
const logoutButton = document.getElementById("logout-button");

const state = {
  data: null
};

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.error || `Erro ${response.status}`);
  }

  return payload;
}

async function checkSession() {
  try {
    const payload = await request("/api/admin-session");

    if (payload.authenticated) {
      loginView.classList.add("is-hidden");
      appView.classList.remove("is-hidden");
      await loadContent();
    }
  } catch (error) {
    console.error(error);
  }
}

async function loadContent() {
  saveStatus.textContent = "Carregando conteúdo";
  const payload = await request("/api/admin-content");
  state.data = payload.content;
  renderEditor();
  saveStatus.textContent = "Conteúdo carregado";
}

function renderEditor() {
  editorRoot.innerHTML = `
    ${renderGeneralCard()}
    ${renderCollectionCard("links", "Links úteis", renderLinkItem)}
    ${renderCollectionCard("notices", "Avisos", renderNoticeItem)}
    ${renderCollectionCard("news", "Notícias", renderNewsItem)}
    ${renderCollectionCard("events", "Eventos", renderEventItem)}
  `;

  bindGeneralFields();
  bindCollectionFields();
}

function renderGeneralCard() {
  return `
    <section class="editor-card">
      <div class="editor-card__header">
        <div>
          <p class="eyebrow">Base</p>
          <h2>Informações gerais</h2>
        </div>
      </div>
      <div class="field-grid field-grid--two">
        <label>
          <span>Nome da turma</span>
          <input id="field-className" value="${escapeHtml(state.data.className)}" />
        </label>
        <label>
          <span>Última atualização</span>
          <input id="field-lastUpdated" type="date" value="${escapeHtml(state.data.lastUpdated || todayYmd())}" />
        </label>
      </div>
    </section>
  `;
}

function renderCollectionCard(key, title, renderItem) {
  return `
    <section class="editor-card">
      <div class="editor-card__header">
        <div>
          <p class="eyebrow">Coleção</p>
          <h2>${title}</h2>
        </div>
        <button type="button" class="add-button" data-action="add" data-list="${key}">Adicionar</button>
      </div>
      <div class="list-stack">
        ${state.data[key].map((item, index) => renderItem(item, index)).join("")}
      </div>
    </section>
  `;
}

function renderLinkItem(item, index) {
  return `
    <article class="editor-item" data-list="links" data-index="${index}">
      <label><span>Título</span><input data-field="title" value="${escapeHtml(item.title)}" /></label>
      <label><span>Descrição</span><textarea data-field="description">${escapeHtml(item.description)}</textarea></label>
      <label><span>URL</span><input data-field="url" value="${escapeHtml(item.url)}" /></label>
      <div class="editor-item__actions">
        <button type="button" class="remove-button" data-action="remove" data-list="links" data-index="${index}">Remover</button>
      </div>
    </article>
  `;
}

function renderNoticeItem(item, index) {
  return `
    <article class="editor-item" data-list="notices" data-index="${index}">
      <label><span>Título</span><input data-field="title" value="${escapeHtml(item.title)}" /></label>
      <label><span>Descrição</span><textarea data-field="description">${escapeHtml(item.description)}</textarea></label>
      <div class="editor-item__two">
        <label>
          <span>Prioridade</span>
          <select data-field="priority">${renderOptions(["alta", "média", "baixa"], item.priority)}</select>
        </label>
        <label><span>Autor</span><input data-field="author" value="${escapeHtml(item.author)}" /></label>
      </div>
      <label><span>Data</span><input data-field="date" type="date" value="${escapeHtml(item.date || todayYmd())}" /></label>
      <div class="editor-item__actions">
        <button type="button" class="remove-button" data-action="remove" data-list="notices" data-index="${index}">Remover</button>
      </div>
    </article>
  `;
}

function renderNewsItem(item, index) {
  return `
    <article class="editor-item" data-list="news" data-index="${index}">
      <label><span>Título</span><input data-field="title" value="${escapeHtml(item.title)}" /></label>
      <label><span>Descrição</span><textarea data-field="description">${escapeHtml(item.description)}</textarea></label>
      <div class="editor-item__two">
        <label><span>Categoria</span><input data-field="category" value="${escapeHtml(item.category)}" /></label>
        <label><span>Data</span><input data-field="date" type="date" value="${escapeHtml(item.date || todayYmd())}" /></label>
      </div>
      <div class="editor-item__actions">
        <button type="button" class="remove-button" data-action="remove" data-list="news" data-index="${index}">Remover</button>
      </div>
    </article>
  `;
}

function renderEventItem(item, index) {
  return `
    <article class="editor-item" data-list="events" data-index="${index}">
      <label><span>Título</span><input data-field="title" value="${escapeHtml(item.title)}" /></label>
      <label><span>Descrição</span><textarea data-field="description">${escapeHtml(item.description)}</textarea></label>
      <div class="editor-item__two">
        <label><span>Tipo</span><select data-field="type">${renderOptions(["aula", "prova", "feriado", "aviso"], item.type)}</select></label>
        <label><span>Data</span><input data-field="date" type="date" value="${escapeHtml(item.date || todayYmd())}" /></label>
      </div>
      <div class="editor-item__two">
        <label><span>Horário</span><input data-field="time" value="${escapeHtml(item.time)}" /></label>
        <label><span>Local</span><input data-field="location" value="${escapeHtml(item.location)}" /></label>
      </div>
      <label><span>Professor</span><input data-field="teacher" value="${escapeHtml(item.teacher)}" /></label>
      <div class="editor-item__actions">
        <button type="button" class="remove-button" data-action="remove" data-list="events" data-index="${index}">Remover</button>
      </div>
    </article>
  `;
}

function renderOptions(options, selected) {
  return options
    .map((option) => `<option value="${option}" ${option === selected ? "selected" : ""}>${option}</option>`)
    .join("");
}

function bindGeneralFields() {
  document.getElementById("field-className").addEventListener("input", (event) => {
    state.data.className = event.target.value;
  });

  document.getElementById("field-lastUpdated").addEventListener("input", (event) => {
    state.data.lastUpdated = event.target.value;
  });
}

function bindCollectionFields() {
  document.querySelectorAll("[data-action='add']").forEach((button) => {
    button.addEventListener("click", () => addItem(button.dataset.list));
  });

  document.querySelectorAll("[data-action='remove']").forEach((button) => {
    button.addEventListener("click", () => removeItem(button.dataset.list, Number(button.dataset.index)));
  });

  document.querySelectorAll(".editor-item").forEach((itemNode) => {
    const list = itemNode.dataset.list;
    const index = Number(itemNode.dataset.index);

    itemNode.querySelectorAll("[data-field]").forEach((field) => {
      const update = (event) => {
        state.data[list][index][field.dataset.field] = event.target.value;
      };

      field.addEventListener("input", update);
      if (field.tagName === "SELECT") {
        field.addEventListener("change", update);
      }
    });
  });
}

function addItem(list) {
  const templates = {
    links: { title: "", description: "", url: "" },
    notices: { title: "", description: "", priority: "média", author: "", date: todayYmd() },
    news: { title: "", description: "", category: "", date: todayYmd() },
    events: { title: "", description: "", type: "aula", date: todayYmd(), time: "", location: "", teacher: "" }
  };

  state.data[list].push(clone(templates[list]));
  renderEditor();
}

function removeItem(list, index) {
  state.data[list].splice(index, 1);
  renderEditor();
}

async function handleLogin(event) {
  event.preventDefault();
  loginFeedback.textContent = "Validando acesso";

  const formData = new FormData(loginForm);

  try {
    await request("/api/admin-login", {
      method: "POST",
      body: JSON.stringify({
        username: formData.get("username"),
        password: formData.get("password")
      })
    });

    loginFeedback.textContent = "";
    loginView.classList.add("is-hidden");
    appView.classList.remove("is-hidden");
    await loadContent();
  } catch (error) {
    loginFeedback.textContent = error.message;
  }
}

async function handleSave() {
  state.data.lastUpdated = todayYmd();
  saveStatus.textContent = "Salvando no GitHub";
  saveButton.disabled = true;

  try {
    await request("/api/admin-content", {
      method: "PUT",
      body: JSON.stringify({ content: state.data })
    });
    renderEditor();
    saveStatus.textContent = "Conteúdo salvo. Aguarde o novo deploy da Vercel.";
  } catch (error) {
    saveStatus.textContent = error.message;
  } finally {
    saveButton.disabled = false;
  }
}

async function handleLogout() {
  await request("/api/admin-logout", { method: "POST" });
  state.data = null;
  editorRoot.innerHTML = "";
  appView.classList.add("is-hidden");
  loginView.classList.remove("is-hidden");
}

loginForm.addEventListener("submit", handleLogin);
saveButton.addEventListener("click", handleSave);
logoutButton.addEventListener("click", handleLogout);

checkSession();
