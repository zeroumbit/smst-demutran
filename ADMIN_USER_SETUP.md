# Adding Administrator User to Supabase

This document explains how to add the administrator user to your Supabase project with the credentials:

- Email: `socialmidiasmstcaninde@gmail.com`
- Password: `0413$mstC`

## Method 1: Using the Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/dtuojkipijsmrmsynqjw/auth/users
2. Log in with your Supabase account credentials
3. Navigate to Authentication → Users
4. Click "New User"
5. Enter the email: `socialmidiasmstcaninde@gmail.com`
6. Set the password: `0413$mstC`
7. Make sure "Email Confirm" is checked to confirm the user immediately
8. Click "Create User"

## Method 2: Using the Script

A script has been provided to programmatically create the admin user.

1. Make sure you have the required environment variables set:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

2. Run the script:
   ```bash
   node create_admin_user.js
   ```

## Method 3: Using SQL

Execute the following SQL command in the SQL Editor of your Supabase Dashboard:

```sql
-- Create an authenticated user directly in the auth schema
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  last_sign_in_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',  -- instance_id
  gen_random_uuid(),  -- id
  'authenticated',  -- aud
  'authenticated',  -- role
  'socialmidiasmstcaninde@gmail.com',  -- email
  crypt('0413$mstC', gen_salt('bf')),  -- encrypted_password
  NOW(),  -- email_confirmed_at
  NOW(),  -- created_at
  NOW(),  -- updated_at
  NULL  -- last_sign_in_at
);
```

## Important Notes

- The SERVICE_ROLE_KEY has full access and bypasses Row Level Security policies
- Store your keys securely and do not commit them to version control
- The password should meet any password strength requirements configured in your Supabase Auth settings
- After creation, the admin user will be able to access the admin sections of the website