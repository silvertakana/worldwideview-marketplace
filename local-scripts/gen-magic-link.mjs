/**
 * Generates a Supabase magic link for the test user via the admin API.
 * Outputs the action_link URL to navigate to in Playwright.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kvlnzjtcstnaqkpqrquf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const EMAIL = 'docoka9834@noyavip.com';

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var. Set it before running this script.');
  process.exit(1);
}

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
