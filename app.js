let RECIPES = {};
let PLANS = {};
let selectedPlanId = "week-1";
let selectedDayIndex = 0;
let recipeFilter = "all";
let previousView = "recipesView";

const FAVORITES_KEY = "nutrimente-favorites-v1";
const SHOPPING_RECIPES_KEY = "nutrimente-shopping-recipes-v1";
const SHOPPING_CHECKED_KEY = "nutrimente-shopping-checked-v1";
const SELECTED_PLAN_KEY = "nutrimente-selected-plan-v1";

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

function getSavedPlanId() {
  return localStorage.getItem(SELECTED_PLAN_KEY) || "week-1";
}

function savePlanId(id) {
  localStorage.setItem(SELECTED_PLAN_KEY, id);
}

function getFavorites() {
  try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")); }
  catch { return new Set(); }
}

function saveFavorites(set) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set]));
}

function getShoppingRecipes() {
  try { return new Set(JSON.parse(localStorage.getItem(SHOPPING_RECIPES_KEY) || "[]")); }
  catch { return new Set(); }
}

function saveShoppingRecipes(set) {
  localStorage.setItem(SHOPPING_RECIPES_KEY, JSON.stringify([...set]));
}

function getCheckedIngredients() {
  try { return new Set(JSON.parse(localStorage.getItem(SHOPPING_CHECKED_KEY) || "[]")); }
  catch { return new Set(); }
}

function saveCheckedIngredients(set) {
  localStorage.setItem(SHOPPING_CHECKED_KEY, JSON.stringify([...set]));
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
  const savedPlanId = getSavedPlanId();
  if (PLANS[savedPlanId]) {
    selectedPlanId = savedPlanId;
  } else if (available.length > 0) {
    selectedPlanId = available[0];
  }

  fillPlanSelectors();
  selectedDayIndex = getTodayIndex();
  renderWeek();
  renderToday();
  renderRecipes();
  renderFavorites();
  renderShopping();
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

  bindAllActionButtons();
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
  const inShopping = getShoppingRecipes().has(id);

  return `<div class="recipe-row">
    <button class="recipe-link" data-recipe="${escapeHtml(id)}">
      <span>${escapeHtml(recipe.name)}</span><span class="chevron">›</span>
    </button>
    <button class="action-btn shopping-button ${inShopping ? "is-in-shopping" : ""}" data-shopping="${escapeHtml(id)}" aria-label="${inShopping ? "Quitar de la lista de la compra" : "Añadir a la lista de la compra"}">🛒</button>
    <button class="action-btn favorite-button ${favorite ? "is-favorite" : ""}" data-favorite="${escapeHtml(id)}" aria-label="${favorite ? "Quitar de favoritos" : "Añadir a favoritos"}">${favorite ? "★" : "☆"}</button>
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
  bindAllActionButtons();
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
  bindAllActionButtons();
}

function renderFavorites() {
  const query = $("favoriteSearch").value.trim().toLocaleLowerCase("es");
  const favorites = getFavorites();
  const matches = Object.entries(RECIPES)
    .filter(([id, r]) => favorites.has(id) && recipeMatches(r, query))
    .sort((a,b) => a[1].name.localeCompare(b[1].name, "es"));

  $("favoriteCount").textContent = `${matches.length} favorito${matches.length === 1 ? "" : "s"}`;
  $("favoriteList").innerHTML = matches.map(([id]) => recipeButton(id)).join("") || emptyState(favorites.size ? "No hay favoritos que coincidan con la búsqueda." : "Todavía no has marcado ninguna receta como favorita.");
  bindAllActionButtons();
}

function getShoppingIngredientsList() {
  const shoppingRecipeIds = getShoppingRecipes();
  const ingredientMap = new Map();
  shoppingRecipeIds.forEach(id => {
    const recipe = RECIPES[id];
    if (recipe && recipe.ingredients) {
      recipe.ingredients.forEach(ing => {
        const trimmed = ing.trim();
        const normalized = trimmed.toLowerCase();
        if (trimmed && !ingredientMap.has(normalized)) {
          ingredientMap.set(normalized, trimmed);
        }
      });
    }
  });
  return Array.from(ingredientMap.values()).sort((a, b) => a.localeCompare(b, "es"));
}

function renderShopping() {
  const ingredients = getShoppingIngredientsList();
  const checked = getCheckedIngredients();
  const shoppingCount = getShoppingRecipes().size;

  $("shoppingHeader").innerHTML = `
    <div class="shopping-heading-row">
      <div>
        <div class="eyebrow">MI LISTA</div>
        2>Lista de la compra</h2>
      </div>
      ${ingredients.length > 0 ? `<button class="clear-shopping-btn" id="clearShoppingBtn">Borrar lista</button>` : ""}
    </div>
  `;

  if (ingredients.length === 0) {
    $("shoppingCount").textContent = "";
    $("shoppingList").innerHTML = emptyState("No hay ingredientes en la lista. Añade recetas pulsando el botón 🛒 en cualquier receta.");
  } else {
    $("shoppingCount").textContent = `${ingredients.length} ingrediente${ingredients.length === 1 ? "" : "s"} (${shoppingCount} receta${shoppingCount === 1 ? "" : "s"})`;
    $("shoppingList").innerHTML = `
      <ul class="shopping-checklist">
        ${ingredients.map(ing => {
          const isChecked = checked.has(ing.toLowerCase());
          return `
            <li class="shopping-item ${isChecked ? "is-checked" : ""}">
              <label class="checkbox-container">
                <input type="checkbox" data-ingredient="${escapeHtml(ing.toLowerCase())}" ${isChecked ? "checked" : ""}>
                <span class="checkmark"></span>
                <span class="ingredient-text">${escapeHtml(ing)}</span>
              </label>
            </li>
          `;
        }).join("")}
      </ul>
    `;
  }

  bindShoppingCheckboxes();
  if ($("clearShoppingBtn")) {
    $("clearShoppingBtn").onclick = clearShoppingList;
  }
}

function bindShoppingCheckboxes() {
  document.querySelectorAll(".shopping-checklist input[type='checkbox']").forEach(input => {
    input.onchange = e => {
      const ingNorm = e.target.dataset.ingredient;
      const checked = getCheckedIngredients();
      if (e.target.checked) {
        checked.add(ingNorm);
      } else {
        checked.delete(ingNorm);
      }
      saveCheckedIngredients(checked);
      const li = e.target.closest(".shopping-item");
      if (li) {
        li.classList.toggle("is-checked", e.target.checked);
      }
    };
  });
}

function clearShoppingList() {
  if (confirm("¿Quieres borrar todos los ingredientes y desmarcar las recetas de la lista de la compra?")) {
    saveShoppingRecipes(new Set());
    saveCheckedIngredients(new Set());
    refreshCurrentViews();
  }
}

function emptyState(text) { return `<div class="empty-state">${escapeHtml(text)}</div>`; }

function toggleFavorite(id) {
  const favorites = getFavorites();
  if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
  saveFavorites(favorites);
  refreshCurrentViews();
}

function toggleShopping(id) {
  const shopping = getShoppingRecipes();
  if (shopping.has(id)) shopping.delete(id); else shopping.add(id);
  saveShoppingRecipes(shopping);
  refreshCurrentViews();
}

function refreshCurrentViews() {
  renderToday();
  renderWeek();
  renderRecipes();
  renderFavorites();
  renderShopping();
  const detailRecipeId = $("recipeContent").dataset.recipeId;
  if (detailRecipeId && document.getElementById("recipeView").classList.contains("active")) {
    showRecipe(detailRecipeId, previousView);
  }
}

function showRecipe(id, fromView) {
  previousView = fromView || previousView || "recipesView";
  const r = RECIPES[id];
  if (!r) return;
  const favorite = getFavorites().has(id);
  const inShopping = getShoppingRecipes().has(id);
  const groups = (r.groups || []).map(g => filterLabels[g]).filter(Boolean);
  $("recipeContent").dataset.recipeId = id;
  $("recipeContent").innerHTML = `
    <div class="recipe-detail-head">
      <h2>${escapeHtml(r.name)}</h2>
      <div class="detail-actions">
        <button class="detail-action detail-shopping ${inShopping ? "is-in-shopping" : ""}" data-shopping="${escapeHtml(id)}" aria-label="${inShopping ? "Quitar de la lista de la compra" : "Añadir a la lista de la compra"}">🛒</button>
        <button class="detail-action detail-favorite ${favorite ? "is-favorite" : ""}" data-favorite="${escapeHtml(id)}" aria-label="${favorite ? "Quitar de favoritos" : "Añadir a favoritos"}">${favorite ? "★" : "☆"}</button>
      </div>
    </div>
    ${groups.length ? `<div class="recipe-tags">${groups.map(g => `<span>${escapeHtml(g)}</span>`).join("")}</div>` : ""}
    <h3>Ingredientes</h3>
    <ul>${(r.ingredients || []).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
    <h3>Elaboración</h3>
    <p>${escapeHtml(r.preparation || "No hay elaboración registrada en el plan.")}</p>
  `;
  bindAllActionButtons();
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

function bindShoppingButtons() {
  document.querySelectorAll("[data-shopping]").forEach(button => {
    button.onclick = event => {
      event.stopPropagation();
      toggleShopping(button.dataset.shopping);
    };
  });
}

function bindAllActionButtons() {
  bindRecipeButtons();
  bindFavoriteButtons();
  bindShoppingButtons();
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
  savePlanId(id);
  $("planSelect").value = id;
  $("todayPlanSelect").value = id;
  renderWeek();
  renderToday();
}

function goToToday() {
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
    if (view === "weekView") renderWeek();
    if (view === "recipesView") renderRecipes();
    if (view === "favoritesView") renderFavorites();
    if (view === "shoppingView") renderShopping();
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