const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkUserTableStructure() {
  try {
    console.log('Checking users table structure...');
    
    // Try to get all users to see what columns exist
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('Error querying users table:', error);
    } else {
      console.log('Users table query successful');
      console.log('Sample data (if any):', users);
      
      if (users && users.length > 0) {
        console.log('Available columns:', Object.keys(users[0]));
      } else {
        console.log('No users found, but table exists');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUserTableStructure();
