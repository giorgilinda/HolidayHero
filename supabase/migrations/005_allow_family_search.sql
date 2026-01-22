-- Allow users to search for families by name during signup
-- This policy allows anyone (authenticated or not) to search for families
-- so they can join existing families during the signup process
-- 
-- Note: Supabase allows multiple SELECT policies - if any policy allows access,
-- the user can see the row. This policy works alongside "Users can view their families"
-- to allow both: searching during signup AND viewing your own families after joining.

CREATE POLICY "Anyone can search families by name" ON families
  FOR SELECT USING (true);

