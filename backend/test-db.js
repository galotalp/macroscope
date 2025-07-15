const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDbConnection() {
  try {
    console.log('Testing database connection...');
    
    // Check if groups table exists
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('*')
      .limit(1);
    
    if (groupsError) {
      console.error('Groups table error:', groupsError);
      return;
    }
    
    console.log('Groups table exists. Sample data:', groups);
    
    // Check if invite_code column exists
    const { data: groupsWithInvite, error: inviteError } = await supabase
      .from('groups')
      .select('id, name, invite_code')
      .limit(1);
    
    if (inviteError) {
      console.error('Invite code column error:', inviteError);
      console.log('Need to add invite_code column');
    } else {
      console.log('Invite code column exists');
    }
    
    // Check if group_join_requests table exists
    const { data: requests, error: requestsError } = await supabase
      .from('group_join_requests')
      .select('*')
      .limit(1);
    
    if (requestsError) {
      console.error('Join requests table error:', requestsError);
      console.log('Need to create group_join_requests table');
    } else {
      console.log('Join requests table exists');
    }
    
  } catch (error) {
    console.error('Database connection error:', error);
  }
}

testDbConnection();
