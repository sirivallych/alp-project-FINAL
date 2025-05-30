/**
 * Database Fix Script
 * This script fixes database issues by removing problematic indexes.
 * It's used to resolve index-related errors in the MongoDB database.
 */

// Required dependencies
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

/**
 * Main function to fix database issues
 * This function:
 * 1. Connects to MongoDB
 * 2. Removes problematic indexes
 * 3. Lists remaining indexes
 * 4. Disconnects from the database
 */
async function fixDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect to MongoDB with recommended options
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB successfully');
    
    // Attempt to drop the problematic username index
    try {
      await mongoose.connection.db.collection('users').dropIndex('username_1');
      console.log('Successfully dropped the username_1 index');
    } catch (indexError) {
      // Handle case where index might not exist
      console.log('Error dropping index (might not exist):', indexError.message);
    }
    
    // List all remaining indexes for verification
    const indexes = await mongoose.connection.db.collection('users').indexes();
    console.log('Remaining indexes on users collection:');
    indexes.forEach(index => {
      console.log(`- ${JSON.stringify(index.key)}`);
    });
    
    // Clean up: disconnect from the database
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    console.log('Database fixed successfully. You can now restart your server.');
  } catch (error) {
    console.error('Error fixing database:', error);
  }
}

// Execute the database fix function
fixDatabase(); 