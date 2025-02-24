import mongoose from "mongoose";

const HomeMoviesSchema = new mongoose.Schema(
  {
    movies: { type: Array, required: true },
    type: {type: String, default: "Home"}
  },
  { timestamps: true }
);

export default mongoose.models.Home || mongoose.model("Home", HomeMoviesSchema);
