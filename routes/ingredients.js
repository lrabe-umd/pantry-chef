// routes/ingredients.js
// handles all the themealdb api calls
// using express.Router so i can keep this separate from server.js

const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

const MEALDB_BASE = "https://www.themealdb.com/api/json/v1/1";

// GET /api/ingredients/search?ingredient=chicken
// searches themealdb for recipes that use that ingredient
router.get("/search", async (req, res) => {
  const { ingredient } = req.query;

  if (!ingredient) {
    return res.status(400).json({ error: "need to provide an ingredient" });
  }

  try {
    const response = await fetch(`${MEALDB_BASE}/filter.php?i=${encodeURIComponent(ingredient)}`);
    const data = await response.json();

    // themealdb returns null for meals if nothing found
    if (!data.meals) {
      return res.json({ meals: [] });
    }

    // only return first 12 so the page doesnt get crazy long
    const meals = data.meals.slice(0, 12);
    res.json({ meals });
  } catch (err) {
    console.error("error fetching from themealdb:", err);
    res.status(500).json({ error: "something went wrong fetching recipes" });
  }
});

// GET /api/ingredients/meal/:id
// gets full details for one meal by its id
// the search endpoint only returns name/thumbnail/id so we need this for instructions etc
router.get("/meal/:id", async (req, res) => {
  try {
    const response = await fetch(`${MEALDB_BASE}/lookup.php?i=${req.params.id}`);
    const data = await response.json();

    if (!data.meals || data.meals.length === 0) {
      return res.status(404).json({ error: "meal not found" });
    }

    res.json({ meal: data.meals[0] });
  } catch (err) {
    console.error("error fetching meal details:", err);
    res.status(500).json({ error: "something went wrong fetching meal details" });
  }
});

// GET /api/ingredients/random
// gets a random meal from themealdb
router.get("/random", async (req, res) => {
  try {
    const response = await fetch(`${MEALDB_BASE}/random.php`);
    const data = await response.json();

    if (!data.meals || data.meals.length === 0) {
      return res.status(404).json({ error: "could not get a random meal" });
    }

    res.json({ meal: data.meals[0] });
  } catch (err) {
    console.error("error fetching random meal:", err);
    res.status(500).json({ error: "something went wrong" });
  }
});

module.exports = router;
