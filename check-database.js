const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkTables() {
  try {
    console.log('Checking database tables...');
    
    // Try to query the users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Users table does not exist or is not accessible');
      console.log('Error:', usersError.message);
    } else {
      console.log('✅ Users table exists');
    }
    
    // Try to query the groups table
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id')
      .limit(1);
    
    if (groupsError) {
      console.log('❌ Groups table does not exist or is not accessible');
      console.log('Error:', groupsError.message);
    } else {
      console.log('✅ Groups table exists');
    }
    
    // Try to query the projects table
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .limit(1);
    
    if (projectsError) {
      console.log('❌ Projects table does not exist or is not accessible');
      console.log('Error:', projectsError.message);
    } else {
      console.log('✅ Projects table exists');
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkTables();
