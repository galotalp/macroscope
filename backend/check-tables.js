const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndCreateTables() {
  try {
    console.log('Checking if group_join_requests table exists...');
    
    // Try to select from the table to see if it exists
    const { data, error } = await supabase
      .from('group_join_requests')
      .select('id')
      .limit(1);
    
    if (error && error.code === 'PGRST106') {
      console.log('Table does not exist, but that\'s expected with RLS');
    } else if (error) {
      console.log('Table might not exist or has other issues:', error.message);
    } else {
      console.log('Table exists and is accessible');
    }
    
    // Check if invite_code column exists in groups table
    console.log('Checking groups table structure...');
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, name, invite_code')
      .limit(1);
    
    if (groupsError) {
      console.error('Error accessing groups table:', groupsError);
    } else {
      console.log('Groups table accessible, sample data:', groups);
    }
    
  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

checkAndCreateTables();
