-- 0004_anon_lookup_rpcs.sql
--
-- Enabling RLS on `profiles` (0002) correctly stopped anonymous visitors from
-- reading customer rows, but two sign-in paths legitimately need a lookup
-- *before* a session exists and broke as a result:
--
--   * `sendPasswordResetOTP` checked `profiles` for the address before calling
--     `resetPasswordForEmail`, so every reset attempt now answers
--     "No account found".
--   * `signIn` resolves a phone number or username to an email address, so
--     logging in with anything other than an email now always fails.
--
-- Both are replaced by SECURITY DEFINER functions that return the single value
-- each caller needs and nothing else, so no row is ever exposed. The email
-- lookup only echoes back an address the caller already typed, so it does not
-- widen the account-enumeration surface that `resetPasswordForEmail` has
-- anyway.

CREATE OR REPLACE FUNCTION public.email_exists(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE lower(email) = lower(trim(p_email))
  );
$$;

-- Resolves a phone number or username to its account email. Returns NULL when
-- the identifier is unknown or matches more than one row.
CREATE OR REPLACE FUNCTION public.lookup_login_email(p_identifier text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  ident   text := lower(trim(coalesce(p_identifier, '')));
  matches text[];
BEGIN
  IF ident = '' THEN
    RETURN NULL;
  END IF;

  -- An identifier shared by two accounts is treated as unknown rather than
  -- resolving to an arbitrary one of them.
  SELECT array_agg(email) INTO matches
  FROM (
    SELECT email
    FROM public.profiles
    WHERE lower(phone) = ident OR lower(username) = ident
    LIMIT 2
  ) m;

  IF array_length(matches, 1) = 1 THEN
    RETURN matches[1];
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.email_exists(text)        FROM public;
REVOKE ALL ON FUNCTION public.lookup_login_email(text)  FROM public;
GRANT EXECUTE ON FUNCTION public.email_exists(text)       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_login_email(text) TO anon, authenticated;
