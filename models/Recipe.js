// Recipe.js
// mongoose model for a saved recipe
// stores the meal info from themealdb so we dont have to re-fetch it every time

const mongoose = require("mongoose");

const recipeSchema = new mongoose.Schema({
  mealId: { type: String, required: true, unique: true }, // id from themealdb
  name: { type: String, required: true },
  category: { type: String }, // like "Seafood" or "Chicken"
  area: { type: String },     // country of origin
  thumbnail: { type: String }, // url to the meal image
  instructions: { type: String },
  ingredients: [{ type: String }], // list of ingredients with measurements
  notes: { type: String, default: "" }, // user's personal notes on the recipe
  savedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Recipe", recipeSchema);
