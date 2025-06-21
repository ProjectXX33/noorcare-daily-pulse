-- SQL function to allow admins to reset employee passwords
-- This function should be run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION admin_update_user_password(
  user_email TEXT,
  new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  result JSON;
BEGIN
  -- Get the user ID from email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;
  
  -- Check if user exists
  IF user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found with email: ' || user_email
    );
  END IF;
  
  -- Update the user's password in auth.users
  UPDATE auth.users
  SET 
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = NOW()
  WHERE id = user_id;
  
  -- Return success response
  RETURN json_build_object(
    'success', true,
    'message', 'Password updated successfully for user: ' || user_email,
    'user_id', user_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users (admin check should be done in app)
GRANT EXECUTE ON FUNCTION admin_update_user_password(TEXT, TEXT) TO authenticated;

-- Alternative simpler approach - just update the encrypted password
CREATE OR REPLACE FUNCTION simple_admin_password_reset(
  target_email TEXT,
  new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update password directly in auth.users table
  UPDATE auth.users 
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE email = target_email;
  
  -- Return true if a row was updated
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION simple_admin_password_reset(TEXT, TEXT) TO authenticated; 