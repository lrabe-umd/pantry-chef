// routes/saved.js
// crud operations for saved recipes in mongodb

const express = require("express");
const router = express.Router();
const Recipe = require("../models/Recipe");

// GET /api/saved
// returns all saved recipes, newest first
router.get("/", async (req, res) => {
  try {
    const recipes = await Recipe.find().sort({ savedAt: -1 });
    res.json({ recipes });
  } catch (err) {
    console.error("error getting saved recipes:", err);
    res.status(500).json({ error: "could not get saved recipes" });
  }
});

// POST /api/saved
// saves a new recipe to the db
router.post("/", async (req, res) => {
  const { mealId, name, category, area, thumbnail, instructions, ingredients } = req.body;

  if (!mealId || !name) {
    return res.status(400).json({ error: "mealId and name are required" });
  }

  try {
    // check if its already saved so we dont get duplicate errors
    const existing = await Recipe.findOne({ mealId });
    if (existing) {
      return res.status(409).json({ error: "already saved that recipe" });
    }

    const recipe = new Recipe({ mealId, name, category, area, thumbnail, instructions, ingredients });
    await recipe.save();
    res.status(201).json({ message: "recipe saved", recipe });
  } catch (err) {
    console.error("error saving recipe:", err);
    res.status(500).json({ error: "could not save recipe" });
  }
});

// PATCH /api/saved/:mealId/notes
// updates the notes for a saved recipe
router.patch("/:mealId/notes", async (req, res) => {
  const { notes } = req.body;

  try {
    const recipe = await Recipe.findOneAndUpdate(
      { mealId: req.params.mealId },
      { notes: notes },
      { new: true } // return the updated document
    );

    if (!recipe) {
      return res.status(404).json({ error: "recipe not found" });
    }

    res.json({ message: "notes saved", recipe });
  } catch (err) {
    console.error("error updating notes:", err);
    res.status(500).json({ error: "could not update notes" });
  }
});

// DELETE /api/saved/:mealId
// removes a single recipe from the db
router.delete("/:mealId", async (req, res) => {
  try {
    const result = await Recipe.findOneAndDelete({ mealId: req.params.mealId });

    if (!result) {
      return res.status(404).json({ error: "recipe not found" });
    }

    res.json({ message: "recipe removed" });
  } catch (err) {
    console.error("error deleting recipe:", err);
    res.status(500).json({ error: "could not delete recipe" });
  }
});

// DELETE /api/saved
// clears all saved recipes at once
router.delete("/", async (req, res) => {
  try {
    await Recipe.deleteMany({});
    res.json({ message: "all recipes cleared" });
  } catch (err) {
    console.error("error clearing recipes:", err);
    res.status(500).json({ error: "could not clear recipes" });
  }
});

module.exports = router;
