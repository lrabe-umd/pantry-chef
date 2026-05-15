// client.js
// handles everything on the frontend side
// fetches from my own api routes which then talk to mongodb or themealdb

// keep track of which meals are already saved so i can update the buttons
let savedMealIds = new Set();

// switches between the search and saved sections
function showSection(name, event) {
  document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));

  document.getElementById(name + "-section").classList.add("active");
  event.target.classList.add("active");

  if (name === "saved") {
    loadSaved();
  }
}

// called when the search form is submitted
async function searchRecipes(e) {
  e.preventDefault();

  const ingredient = document.getElementById("ingredient-input").value.trim();
  const statusEl = document.getElementById("results-status");
  const gridEl = document.getElementById("results-grid");

  statusEl.textContent = "Searching...";
  gridEl.innerHTML = "";

  try {
    const res = await fetch("/api/ingredients/search?ingredient=" + encodeURIComponent(ingredient));
    const data = await res.json();

    if (!data.meals || data.meals.length === 0) {
      statusEl.textContent = "No recipes found for " + ingredient + ". Try something else.";
      return;
    }

    statusEl.textContent = "Found " + data.meals.length + " recipes with " + ingredient + ":";

    data.meals.forEach((meal) => {
      gridEl.appendChild(createSearchCard(meal));
    });
  } catch (err) {
    statusEl.textContent = "Something went wrong. Try again.";
    console.error(err);
  }
}

// fetches a random recipe and opens it in the modal
async function loadRandom() {
  const statusEl = document.getElementById("results-status");
  const gridEl = document.getElementById("results-grid");

  statusEl.textContent = "Getting a random recipe...";
  gridEl.innerHTML = "";

  try {
    const res = await fetch("/api/ingredients/random");
    const data = await res.json();
    const meal = data.meal;

    statusEl.textContent = "Here is a random recipe for you:";
    gridEl.appendChild(createSearchCard({
      idMeal: meal.idMeal,
      strMeal: meal.strMeal,
      strMealThumb: meal.strMealThumb,
    }));

    // open the modal right away so they see the full details
    openModal(meal.idMeal, false);
  } catch (err) {
    statusEl.textContent = "Could not get a random recipe. Try again.";
    console.error(err);
  }
}

// builds a card element for a search result
function createSearchCard(meal) {
  const card = document.createElement("div");
  card.className = "recipe-card";

  const isSaved = savedMealIds.has(meal.idMeal);

  card.innerHTML =
    '<img src="' + meal.strMealThumb + '" alt="' + meal.strMeal + '" loading="lazy" />' +
    '<div class="card-body">' +
      '<h3>' + meal.strMeal + '</h3>' +
      '<div class="card-actions">' +
        '<button class="btn-save ' + (isSaved ? 'saved-state' : '') + '" ' +
          'id="save-btn-' + meal.idMeal + '" ' +
          'onclick="saveRecipe(\'' + meal.idMeal + '\')">' +
          (isSaved ? 'Saved' : 'Save') +
        '</button>' +
        '<button class="btn-save" onclick="openModal(\'' + meal.idMeal + '\', false)">Details</button>' +
      '</div>' +
    '</div>';

  return card;
}

// pulls ingredients out of the themealdb meal object
// themealdb stores them as strIngredient1, strIngredient2, etc. up to 20
function extractIngredients(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal["strIngredient" + i];
    const measure = meal["strMeasure" + i];
    if (ingredient && ingredient.trim() !== "") {
      const entry = measure && measure.trim() !== ""
        ? measure.trim() + " " + ingredient.trim()
        : ingredient.trim();
      ingredients.push(entry);
    }
  }
  return ingredients;
}

// opens the modal and fetches full recipe details
// fromSaved = true means we opened it from the saved tab
async function openModal(mealId, fromSaved) {
  const overlay = document.getElementById("modal-overlay");
  const content = document.getElementById("modal-content");

  content.innerHTML = "<p>Loading...</p>";
  overlay.classList.add("open");

  try {
    const res = await fetch("/api/ingredients/meal/" + mealId);
    const data = await res.json();
    const meal = data.meal;

    const isSaved = savedMealIds.has(mealId);
    const ingredients = extractIngredients(meal);
    const ingredientList = ingredients.map((ing) => '<li>' + ing + '</li>').join("");

    const shortInstructions = meal.strInstructions
      ? meal.strInstructions.slice(0, 800) + "..."
      : "No instructions available.";

    // hide save button if viewing from saved tab
    const saveBtn = fromSaved
      ? ""
      : '<button class="btn-primary" id="modal-save-btn" ' +
          'onclick="saveRecipeFromModal(\'' + mealId + '\', \'' + escapeStr(meal.strMeal) + '\', \'' +
          escapeStr(meal.strCategory) + '\', \'' + escapeStr(meal.strArea) + '\', \'' + meal.strMealThumb + '\')">' +
          (isSaved ? 'Already Saved' : 'Save Recipe') +
        '</button>';

    // if viewing from saved tab, show notes section with any existing notes
    let notesHtml = "";
    if (fromSaved) {
      const savedRes = await fetch("/api/saved");
      const savedData = await savedRes.json();
      const savedRecipe = savedData.recipes.find((r) => r.mealId === mealId);
      const existingNotes = savedRecipe ? (savedRecipe.notes || "") : "";

      notesHtml =
        '<h3>My Notes</h3>' +
        '<textarea id="notes-input" class="notes-input" placeholder="Add your notes here... (e.g. add more garlic, great for meal prep)">' +
        existingNotes +
        '</textarea>' +
        '<button class="btn-save" onclick="saveNotes(\'' + mealId + '\')">Save Notes</button>' +
        '<p id="notes-status" class="notes-status"></p>';
    }

    content.innerHTML =
      '<img class="modal-img" src="' + meal.strMealThumb + '" alt="' + meal.strMeal + '" />' +
      '<h2>' + meal.strMeal + '</h2>' +
      '<p class="modal-meta">' + (meal.strCategory || "") + (meal.strArea ? " - " + meal.strArea : "") + '</p>' +
      '<h3>Ingredients</h3>' +
      '<ul class="ingredient-list">' + ingredientList + '</ul>' +
      '<h3>Instructions</h3>' +
      '<p>' + shortInstructions + '</p>' +
      notesHtml +
      saveBtn;

    if (!fromSaved && isSaved) {
      const btn = document.getElementById("modal-save-btn");
      if (btn) btn.disabled = true;
    }
  } catch (err) {
    content.innerHTML = "<p>Could not load recipe details.</p>";
    console.error(err);
  }
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
}

// saves notes for a recipe to mongodb
async function saveNotes(mealId) {
  const notes = document.getElementById("notes-input").value;
  const statusEl = document.getElementById("notes-status");

  try {
    const res = await fetch("/api/saved/" + mealId + "/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notes }),
    });

    if (res.ok) {
      statusEl.textContent = "Notes saved.";
      // clear the message after a couple seconds
      setTimeout(() => { statusEl.textContent = ""; }, 2000);
    } else {
      statusEl.textContent = "Could not save notes.";
    }
  } catch (err) {
    statusEl.textContent = "Could not save notes.";
    console.error(err);
  }
}

// saves a recipe from the search results card
async function saveRecipe(mealId) {
  if (savedMealIds.has(mealId)) return;

  try {
    const res = await fetch("/api/ingredients/meal/" + mealId);
    const data = await res.json();
    const meal = data.meal;
    const ingredients = extractIngredients(meal);

    await doSave({
      mealId: mealId,
      name: meal.strMeal,
      category: meal.strCategory,
      area: meal.strArea,
      thumbnail: meal.strMealThumb,
      instructions: meal.strInstructions,
      ingredients: ingredients,
    });

    const btn = document.getElementById("save-btn-" + mealId);
    if (btn) {
      btn.textContent = "Saved";
      btn.classList.add("saved-state");
    }
  } catch (err) {
    alert("Could not save recipe.");
    console.error(err);
  }
}

// saves from the modal
async function saveRecipeFromModal(mealId, name, category, area, thumbnail) {
  if (savedMealIds.has(mealId)) return;

  try {
    const res = await fetch("/api/ingredients/meal/" + mealId);
    const data = await res.json();
    const meal = data.meal;
    const ingredients = extractIngredients(meal);

    await doSave({ mealId, name, category, area, thumbnail, instructions: meal.strInstructions, ingredients });

    const modalBtn = document.getElementById("modal-save-btn");
    if (modalBtn) {
      modalBtn.textContent = "Already Saved";
      modalBtn.disabled = true;
    }

    const cardBtn = document.getElementById("save-btn-" + mealId);
    if (cardBtn) {
      cardBtn.textContent = "Saved";
      cardBtn.classList.add("saved-state");
    }
  } catch (err) {
    alert("Could not save recipe.");
    console.error(err);
  }
}

// actually sends the POST request to my api to save to mongodb
async function doSave(payload) {
  const res = await fetch("/api/saved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (res.ok) {
    savedMealIds.add(payload.mealId);
  } else if (res.status !== 409) {
    throw new Error(data.error);
  }
}

// loads saved recipes from mongodb and renders them
async function loadSaved() {
  const grid = document.getElementById("saved-grid");
  const emptyMsg = document.getElementById("saved-empty");
  grid.innerHTML = "";

  try {
    const res = await fetch("/api/saved");
    const data = await res.json();

    savedMealIds = new Set(data.recipes.map((r) => r.mealId));

    if (data.recipes.length === 0) {
      emptyMsg.style.display = "block";
      return;
    }

    emptyMsg.style.display = "none";
    data.recipes.forEach((recipe) => {
      grid.appendChild(createSavedCard(recipe));
    });
  } catch (err) {
    grid.innerHTML = "<p class='status-msg'>Could not load saved recipes.</p>";
    console.error(err);
  }
}

// builds a card for a saved recipe
function createSavedCard(recipe) {
  const card = document.createElement("div");
  card.className = "recipe-card";

  card.innerHTML =
    '<img src="' + recipe.thumbnail + '" alt="' + recipe.name + '" loading="lazy" ' +
      'onclick="openModal(\'' + recipe.mealId + '\', true)" style="cursor:pointer;" />' +
    '<div class="card-body">' +
      '<h3 class="clickable-title" onclick="openModal(\'' + recipe.mealId + '\', true)">' + recipe.name + '</h3>' +
      '<p class="card-meta">' + (recipe.category || "") + (recipe.area ? " - " + recipe.area : "") + '</p>' +
      (recipe.ingredients && recipe.ingredients.length > 0
        ? '<ul class="ingredient-list-small">' +
            recipe.ingredients.slice(0, 5).map((i) => '<li>' + i + '</li>').join("") +
            (recipe.ingredients.length > 5 ? '<li>and ' + (recipe.ingredients.length - 5) + ' more...</li>' : '') +
          '</ul>'
        : '') +
      // show a short preview of notes on the card if there are any
      (recipe.notes
        ? '<p class="notes-preview">"' + recipe.notes.slice(0, 60) + (recipe.notes.length > 60 ? '...' : '') + '"</p>'
        : '') +
      '<div class="card-actions">' +
        '<button class="btn-save" onclick="openModal(\'' + recipe.mealId + '\', true)">View Recipe</button>' +
        '<button class="btn-delete" onclick="deleteRecipe(\'' + recipe.mealId + '\', this)">Remove</button>' +
      '</div>' +
    '</div>';

  return card;
}

// deletes a single saved recipe
async function deleteRecipe(mealId, btn) {
  try {
    const res = await fetch("/api/saved/" + mealId, { method: "DELETE" });

    if (res.ok) {
      savedMealIds.delete(mealId);
      btn.closest(".recipe-card").remove();

      const grid = document.getElementById("saved-grid");
      if (grid.children.length === 0) {
        document.getElementById("saved-empty").style.display = "block";
      }
    }
  } catch (err) {
    alert("Could not remove recipe.");
    console.error(err);
  }
}

// clears every saved recipe at once
async function clearAllSaved() {
  const confirmed = confirm("Are you sure you want to remove all saved recipes?");
  if (!confirmed) return;

  try {
    const res = await fetch("/api/saved", { method: "DELETE" });

    if (res.ok) {
      savedMealIds.clear();
      document.getElementById("saved-grid").innerHTML = "";
      document.getElementById("saved-empty").style.display = "block";
    }
  } catch (err) {
    alert("Could not clear recipes.");
    console.error(err);
  }
}

// helper to escape single quotes in strings going into html attributes
function escapeStr(str) {
  if (!str) return "";
  return str.replace(/'/g, "\\'");
}

// on page load, fetch saved recipe ids so the save buttons show correctly
(async function init() {
  try {
    const res = await fetch("/api/saved");
    const data = await res.json();
    savedMealIds = new Set(data.recipes.map((r) => r.mealId));
  } catch (e) {
    console.error("could not load saved ids on init:", e);
  }
})();
