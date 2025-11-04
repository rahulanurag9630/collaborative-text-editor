import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://anuragsinghkushwaha45_db_user:Q5jl1yGv23qANXVb@cluster0.qcw2kmr.mongodb.net/";

if (!MONGODB_URI) {
  console.warn('Warning: MONGODB_URI not set. Set your MongoDB Atlas connection string in environment variables.');
}

export const connectMongo = async () => {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  if (mongoose.connection.readyState === 1) return mongoose.connection;

  mongoose.set('strictQuery', true);

  await mongoose.connect(MONGODB_URI, {
    dbName: process.env.MONGODB_DB || undefined,
  });

  console.log('Connected to MongoDB');
  return mongoose.connection;
};

export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);


