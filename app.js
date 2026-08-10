let RECIPES = {};
let PLANS = {};
let selectedPlanId = "week-1";
let currentDayIndex = 0;

const $ = id => document.getElementById(id);
const dayNames = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

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
  currentDayIndex = (new Date().getDay() + 6) % 7;
  renderWeek();
  renderToday();
  renderRecipes();
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
  const days = plan.days;

  $("weekLabel").textContent = `${dayNames[currentDayIndex]} · ${currentDayIndex + 1}/7`;

  $("weekGrid").innerHTML = days.map((day, i) => `
    <article class="day-card ${i === currentDayIndex ? "today" : ""}" id="day-${i}">
      <div class="day-head">
        <div>
          <div class="day-name">${escapeHtml(day.name)}</div>
          ${i === currentDayIndex ? '<div class="today-mark">HOY</div>' : ""}
        </div>
      </div>
      ${renderMealGroup("🍽️ Comida", day.comida)}
      ${renderMealGroup("🌙 Cena", day.cena)}
    </article>
  `).join("");

  bindRecipeButtons();
  $("day-" + currentDayIndex)?.scrollIntoView({behavior:"smooth", block:"nearest"});
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
  return `<button class="recipe-link" data-recipe="${escapeHtml(id)}">
    <span>${escapeHtml(recipe.name)}</span><span class="chevron">›</span>
  </button>`;
}

function renderToday() {
  const plan = getPlan();
  const day = plan.days[currentDayIndex];
  $("todayDate").textContent = day.name;
  $("todayContent").innerHTML =
    renderMealGroup("🍽️ Comida", day.comida) +
    renderMealGroup("🌙 Cena", day.cena);
  bindRecipeButtons();
}

function renderRecipes() {
  const query = $("recipeSearch").value.trim().toLocaleLowerCase("es");
  const matches = Object.entries(RECIPES)
    .filter(([id, r]) => {
      const haystack = [
        r.name,
        ...(r.ingredients || [])
      ].join(" ").toLocaleLowerCase("es");
      return !query || haystack.includes(query);
    })
    .sort((a,b) => a[1].name.localeCompare(b[1].name, "es"));

  $("recipeCount").textContent = query
    ? `${matches.length} resultado${matches.length === 1 ? "" : "s"}`
    : `${matches.length} recetas`;

  $("recipeList").innerHTML = matches.map(([id]) => recipeButton(id)).join("");
  bindRecipeButtons();
}

function showRecipe(id) {
  const r = RECIPES[id];
  if (!r) return;

  $("recipeContent").innerHTML = `
    <h2>${escapeHtml(r.name)}</h2>
    <h3>Ingredientes</h3>
    <ul>${(r.ingredients || []).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
    <h3>Elaboración</h3>
    <p>${escapeHtml(r.preparation || "No hay elaboración registrada en el plan.")}</p>
  `;
  showView("recipeView");
}

function bindRecipeButtons() {
  document.querySelectorAll("[data-recipe]").forEach(button => {
    button.onclick = () => showRecipe(button.dataset.recipe);
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
  currentDayIndex = (new Date().getDay() + 6) % 7;
  renderWeek();
  renderToday();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

$("planSelect").addEventListener("change", e => changePlan(e.target.value));
$("todayPlanSelect").addEventListener("change", e => changePlan(e.target.value));

$("prevDay").onclick = () => {
  currentDayIndex = (currentDayIndex + 6) % 7;
  renderWeek();
};
$("nextDay").onclick = () => {
  currentDayIndex = (currentDayIndex + 1) % 7;
  renderWeek();
};
$("todayBtn").onclick = () => {
  currentDayIndex = (new Date().getDay() + 6) % 7;
  renderToday();
  showView("todayView");
};
$("recipeSearch").addEventListener("input", renderRecipes);
$("backRecipe").onclick = () => showView("recipesView");

document.querySelectorAll(".nav-item").forEach(button => {
  button.onclick = () => {
    const view = button.dataset.view;
    if (view === "todayView") renderToday();
    if (view === "recipesView") renderRecipes();
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
