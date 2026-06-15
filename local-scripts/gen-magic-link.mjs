/**
 * Generates a Supabase magic link for the test user via the admin API.
 * Outputs the action_link URL to navigate to in Playwright.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kvlnzjtcstnaqkpqrquf.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2bG56anRjc3RuYXFrcHFycXVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcxOTEzMCwiZXhwIjoyMDkxMjk1MTMwfQ.D3Y2-0gh_Q2ZvZ2tii9vgTf8f19SAMC1eUlLebtvFzU';
const EMAIL = 'docoka9834@noyavip.com';

// wwv.local callback will exchange code for session then redirect to marketplace browse
const REDIRECT_TO = 'https://wwv.local:3001/api/auth/callback?next=https://marketplace.wwv.local:3002/browse';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: EMAIL,
  options: { redirectTo: REDIRECT_TO },
});

if (error) {
  console.error('Failed to generate link:', error.message);
  process.exit(1);
}

console.log(data.properties.action_link);
