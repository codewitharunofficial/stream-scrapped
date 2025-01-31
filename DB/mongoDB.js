import mongoose from "mongoose";

const connectToDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_DB_URL);
    console.log(`Connected to DB ${conn.connection.host}`);
  } catch (error) {
    console.log(error);
  }
};

export default connectToDB;
