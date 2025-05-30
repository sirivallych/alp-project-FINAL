/**
 * Database Check Script
 * This script performs a diagnostic check of the MongoDB database.
 * It verifies database connection, lists collections, checks user data, and examines indexes.
 */

// Required dependencies
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

/**
 * Main function to check database status
 * This function:
 * 1. Connects to MongoDB
 * 2. Lists all collections
 * 3. Checks user data
 * 4. Examines database indexes
 * 5. Disconnects from the database
 */
async function checkDatabase() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    console.log('MONGO_URI:', process.env.MONGO_URI);
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB successfully');
    
    // List all collections in the database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in database:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Check users collection and its contents
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const users = await User.find({});
    console.log(`Found ${users.length} users in the database`);
    
    // Display user details if any users exist
    if (users.length > 0) {
      console.log('User details:');
      users.forEach(user => {
        console.log(`- Email: ${user.email}, Created: ${user.createdAt}`);
      });
    }
    
    // Check and display all indexes on the users collection
    const indexes = await mongoose.connection.db.collection('users').indexes();
    console.log('Indexes on users collection:');
    indexes.forEach(index => {
      console.log(`- ${JSON.stringify(index.key)}`);
    });
    
    // Clean up: disconnect from the database
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

// Execute the database check function
checkDatabase(); 