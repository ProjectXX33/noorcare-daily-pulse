-- Improved password reset function that handles auth/users table sync
-- Run this in Supabase SQL Editor to replace the existing function

-- First, let's create a function that finds the auth user ID from the users table
CREATE OR REPLACE FUNCTION find_auth_user_by_email(target_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid UUID;
BEGIN
  -- First try to find in users table (our app table)
  SELECT id INTO user_uuid
  FROM users
  WHERE email = target_email;
  
  -- If found in users table, return that UUID
  IF user_uuid IS NOT NULL THEN
    RETURN user_uuid;
  END IF;
  
  -- If not found in users table, try auth.users directly
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = target_email;
  
  RETURN user_uuid;
END;
$$;

-- Improved password reset function
CREATE OR REPLACE FUNCTION admin_reset_password_improved(
  target_email TEXT,
  new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid UUID;
  rows_updated INTEGER;
BEGIN
  -- Find the user UUID using our helper function
  SELECT find_auth_user_by_email(target_email) INTO user_uuid;
  
  -- Check if user exists
  IF user_uuid IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found with email: ' || target_email,
      'searched_in', 'both users and auth.users tables'
    );
  END IF;
  
  -- Update the password in auth.users using the UUID
  UPDATE auth.users
  SET 
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = NOW()
  WHERE id = user_uuid;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  -- Return detailed response
  RETURN json_build_object(
    'success', true,
    'message', 'Password updated successfully',
    'user_id', user_uuid,
    'email', target_email,
    'rows_updated', rows_updated
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION find_auth_user_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reset_password_improved(TEXT, TEXT) TO authenticated;

-- Also update the simple function to use UUID lookup
CREATE OR REPLACE FUNCTION simple_admin_password_reset_v2(
  target_email TEXT,
  new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid UUID;
  rows_updated INTEGER;
BEGIN
  -- Find user UUID from our users table first
  SELECT id INTO user_uuid
  FROM users
  WHERE email = target_email;
  
  -- If not found in users table, try auth.users
  IF user_uuid IS NULL THEN
    SELECT id INTO user_uuid
    FROM auth.users
    WHERE email = target_email;
  END IF;
  
  -- If still not found, return error
  IF user_uuid IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'found', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Update password using UUID
  UPDATE auth.users 
  SET 
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = now()
  WHERE id = user_uuid;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'found', true,
    'user_id', user_uuid,
    'rows_updated', rows_updated
  );
END;
$$;

GRANT EXECUTE ON FUNCTION simple_admin_password_reset_v2(TEXT, TEXT) TO authenticated; 