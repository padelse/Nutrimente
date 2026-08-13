let RECIPES = {};
let PLANS = {};
let selectedPlanId = "week-1";
let selectedDayIndex = 0;
let recipeFilter = "all";
const FAVORITES_KEY = "nutrimente-favorites-v1";

const $ = id => document.getElementById(id);
const dayNames = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const filterLabels = {
  all: "Todas",
  "almuerzo-entrante": "Almuerzo · entrante",
  "almuerzo-principal": "Almuerzo · principal",
  "cena-entrante": "Cena · entrante",
  "cena-principal": "Cena · principal"
};

function getTodayIndex() {
  return (new Date().getDay() + 6) % 7;
}

function getFavorites() {
  try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")); }
  catch { return new Set(); }
}

function saveFavorites(set) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set]));
}

async function loadData() {
  const [recipesResponse, plansResponse] = await Promise.all([
    fetch("recipes.json"),
    fetch("plans.json")
  ]);
  if (!recipesResponse.ok || !plansResponse.ok) throw new Error("No se pudieron cargar los datos.");
  RECIPES = await recipesResponse.json();
  PLANS = await plansResponse.json();

  const available = Object.keys(PLANS);
  if (!PLANS[selectedPlanId]) selectedPlanId = available[0];

  fillPlanSelectors();
  selectedDayIndex = getTodayIndex();
  renderWeek();
  renderToday();
  renderRecipes();
  renderFavorites();
}

function fillPlanSelectors() {
  const options = Object.values(PLANS).map(p =>
    `<option value="${p.id}">${escapeHtml(p.name)}</option>`
  ).join("");
  $("planSelect").innerHTML = options;
  $("todayPlanSelect").innerHTML = options;
  $("planSelect").value = selectedPlanId;
  $("todayPlanSelect").value = selectedPlanId;
}

function getPlan() { return PLANS[selectedPlanId]; }

function renderWeek() {
  const plan = getPlan();
  const day = plan.days[selectedDayIndex];

  document.querySelectorAll("#daySelector [data-day]").forEach(button => {
    button.classList.toggle("active", Number(button.dataset.day) === selectedDayIndex);
  });

  $("weekGrid").innerHTML = `
    <article class="day-card selected-day" id="day-${selectedDayIndex}">
      <div class="day-head">
        <div class="day-name">${escapeHtml(day.name)}</div>
      </div>
      ${renderMealGroup("🍽️ Comida", day.comida)}
      ${renderMealGroup("🌙 Cena", day.cena)}
    </article>
  `;

  bindRecipeButtons();
}

function renderMealGroup(title, recipeIds) {
  return `
    <div class="meal-group">
      <div class="meal-title">${title}</div>
      ${recipeIds.map(id => recipeButton(id)).join("")}
    </div>
  `;
}

function recipeButton(id) {
  const recipe = RECIPES[id];
  if (!recipe) return "";
  const favorite = getFavorites().has(id);
  return `<div class="recipe-row">
    <button class="recipe-link" data-recipe="${escapeHtml(id)}">
      <span>${escapeHtml(recipe.name)}</span><span class="chevron">›</span>
    </button>
    <button class="favorite-button ${favorite ? "is-favorite" : ""}" data-favorite="${escapeHtml(id)}" aria-label="${favorite ? "Quitar de favoritos" : "Añadir a favoritos"}">${favorite ? "★" : "☆"}</button>
  </div>`;
}

function renderToday() {
  const plan = getPlan();
  const todayIndex = getTodayIndex();
  const day = plan.days[todayIndex];
  $("todayDate").textContent = day.name;
  $("todayContent").innerHTML =
    renderMealGroup("🍽️ Comida", day.comida) +
    renderMealGroup("🌙 Cena", day.cena);
  bindRecipeButtons();
}

function recipeMatches(recipe, query) {
  const haystack = [recipe.name, ...(recipe.ingredients || [])].join(" ").toLocaleLowerCase("es");
  return !query || haystack.includes(query);
}

function renderRecipes() {
  const query = $("recipeSearch").value.trim().toLocaleLowerCase("es");
  const matches = Object.entries(RECIPES)
    .filter(([id, r]) => {
      const inGroup = recipeFilter === "all" || (r.groups || []).includes(recipeFilter);
      return inGroup && recipeMatches(r, query);
    })
    .sort((a,b) => a[1].name.localeCompare(b[1].name, "es"));

  $("recipeCount").textContent = query || recipeFilter !== "all"
    ? `${matches.length} resultado${matches.length === 1 ? "" : "s"}`
    : `${matches.length} recetas`;
  $("recipeList").innerHTML = matches.map(([id]) => recipeButton(id)).join("") || emptyState("No hay recetas que coincidan.");
  bindRecipeButtons();
}

function renderFavorites() {
  const query = $("favoriteSearch").value.trim().toLocaleLowerCase("es");
  const favorites = getFavorites();
  const matches = Object.entries(RECIPES)
    .filter(([id, r]) => favorites.has(id) && recipeMatches(r, query))
    .sort((a,b) => a[1].name.localeCompare(b[1].name, "es"));

  $("favoriteCount").textContent = `${matches.length} favorito${matches.length === 1 ? "" : "s"}`;
  $("favoriteList").innerHTML = matches.map(([id]) => recipeButton(id)).join("") || emptyState(favorites.size ? "No hay favoritos que coincidan con la búsqueda." : "Todavía no has marcado ninguna receta como favorita.");
  bindRecipeButtons();
}

function emptyState(text) { return `<div class="empty-state">${escapeHtml(text)}</div>`; }

function toggleFavorite(id) {
  const favorites = getFavorites();
  if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
  saveFavorites(favorites);
  renderRecipes();
  renderFavorites();
  if ($("recipeContent").dataset.recipeId === id) showRecipe(id);
}

function showRecipe(id, fromView) {
  previousView = fromView || previousView || "recipesView";
  const r = RECIPES[id];
  if (!r) return;
  const favorite = getFavorites().has(id);
  const groups = (r.groups || []).map(g => filterLabels[g]).filter(Boolean);
  $("recipeContent").dataset.recipeId = id;
  $("recipeContent").innerHTML = `
    <div class="recipe-detail-head">
      <h2>${escapeHtml(r.name)}</h2>
      <button class="detail-favorite ${favorite ? "is-favorite" : ""}" data-favorite="${escapeHtml(id)}" aria-label="${favorite ? "Quitar de favoritos" : "Añadir a favoritos"}">${favorite ? "★" : "☆"}</button>
    </div>
    ${groups.length ? `<div class="recipe-tags">${groups.map(g => `<span>${escapeHtml(g)}</span>`).join("")}</div>` : ""}
    <h3>Ingredientes</h3>
    <ul>${(r.ingredients || []).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
    <h3>Elaboración</h3>
    <p>${escapeHtml(r.preparation || "No hay elaboración registrada en el plan.")}</p>
  `;
  bindFavoriteButtons();
  showView("recipeView");
}

function bindRecipeButtons() {
  document.querySelectorAll("[data-recipe]").forEach(button => {
    button.onclick = () => {
      const current = document.querySelector(".view.active");
      const fromView = current ? current.id : "recipesView";
      showRecipe(button.dataset.recipe, fromView);
    };
  });
}

function bindFavoriteButtons() {
  document.querySelectorAll("[data-favorite]").forEach(button => {
    button.onclick = event => {
      event.stopPropagation();
      toggleFavorite(button.dataset.favorite);
    };
  });
}

function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  $(id).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(b =>
    b.classList.toggle("active", b.dataset.view === id)
  );
  window.scrollTo({top:0, behavior:"smooth"});
}

function changePlan(id) {
  selectedPlanId = id;
  $("planSelect").value = id;
  $("todayPlanSelect").value = id;
  renderWeek();
  renderToday();
}

function goToToday() {
  const todayIndex = getTodayIndex();
  renderToday();
  showView("todayView");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

$("planSelect").addEventListener("change", e => changePlan(e.target.value));
$("todayPlanSelect").addEventListener("change", e => changePlan(e.target.value));

$("daySelector").querySelectorAll("[data-day]").forEach(button => {
  button.onclick = () => {
    selectedDayIndex = Number(button.dataset.day);
    renderWeek();
    window.scrollTo({top:0, behavior:"smooth"});
  };
});
$("todayBtn").onclick = goToToday;
$("recipeSearch").addEventListener("input", renderRecipes);
$("favoriteSearch").addEventListener("input", renderFavorites);
$("backRecipe").onclick = () => showView(previousView || "recipesView");

$("recipeFilters").querySelectorAll("[data-filter]").forEach(button => {
  button.onclick = () => {
    recipeFilter = button.dataset.filter;
    $("recipeFilters").querySelectorAll("[data-filter]").forEach(b => b.classList.toggle("active", b === button));
    renderRecipes();
  };
});

document.querySelectorAll(".nav-item").forEach(button => {
  button.onclick = () => {
    const view = button.dataset.view;
    if (view === "todayView") renderToday();
    if (view === "recipesView") renderRecipes();
    if (view === "favoritesView") renderFavorites();
    showView(view);
  };
});

loadData().catch(error => {
  console.error(error);
  document.body.innerHTML = `
    <div class="error">
      <h2>No se han podido cargar los datos</h2>
      <p>Si estás abriendo los archivos directamente desde el iPhone o el ordenador, usa GitHub Pages o un servidor web local.</p>
    </div>`;
});
