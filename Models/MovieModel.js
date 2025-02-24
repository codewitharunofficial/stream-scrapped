import mongoose from "mongoose";

const MovieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, },
    slug: { type: String, required: true, unique: true },
    thumbnail: { type: String },
    season: { type: String },
  },
  { timestamps: true }
);

 MovieSchema.index({title: "text", slug: "text"});

export default mongoose.models.Movie || mongoose.model("Movie", MovieSchema);
