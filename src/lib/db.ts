'use server'
import mongoose from 'mongoose';
import { getEnvironmentVariable } from './utils';

const MONGODB_URI = getEnvironmentVariable('MONGODB_URI');

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

/* eslint-disable no-var */
declare global {
  var mongoose: MongooseCache | undefined;
}
/* eslint-enable no-var */
const cached: MongooseCache = global.mongoose || { conn: null, promise: null };


if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  // Return existing connection if available
  if (cached.conn) {
    console.log('Using existing MongoDB connection');
    return cached.conn;
  }

  // Return existing promise if connection is in progress
  if (cached.promise) {
    console.log('MongoDB connection in progress, waiting...');
    return cached.promise;
  }

  // Configure mongoose options for better performance and reliability
  const opts = {
    bufferCommands: false, // Disable mongoose buffering
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4, // Use IPv4, skip trying IPv6
  };

  console.log('Connecting to MongoDB...');
  
  try {
    console.log(MONGODB_URI, mongoose.connect)
    cached.promise = mongoose.connect(MONGODB_URI, opts);
    cached.conn = await cached.promise;
    
    console.log('✅ Connected to MongoDB successfully');
    
    // Set up event listeners
    mongoose.connection.on('error', (err:any) => {
      console.error('❌ MongoDB connection error:', err);
      cached.conn = null;
      cached.promise = null;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
      cached.conn = null;
      cached.promise = null;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    return cached.conn;
  } catch (error:any) {
    cached.promise = null;
    console.error('❌ Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    console.log('MongoDB already disconnected');
    return;
  }

  try {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
    throw error;
  }
}


