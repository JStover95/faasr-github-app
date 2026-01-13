CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  gh_installation_id TEXT,
  gh_user_login TEXT,
  gh_user_id INTEGER,
  gh_avatar_url TEXT,
  gh_repo_name TEXT

  PRIMARY KEY (id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Inserts a row into public.profiles
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY definer SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$;

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR each ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function for inserting installation_id into public.profiles
CREATE FUNCTION public.insert_gh_installation(
  profile_id UUID,
  gh_installation_id TEXT,
  gh_user_login TEXT,
  gh_user_id INTEGER,
  gh_avatar_url TEXT,
  gh_repo_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY definer SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET
    gh_installation_id = $2,
    gh_user_login = $3,
    gh_user_id = $4,
    gh_avatar_url = $5,
    gh_repo_name = $6
  WHERE id = $1;
END;
$$;

-- Function for getting installation_id from public.profiles
CREATE FUNCTION public.get_gh_installation(profile_id UUID)
RETURNS TABLE (
  gh_installation_id TEXT,
  gh_user_login TEXT,
  gh_user_id INTEGER,
  gh_avatar_url TEXT,
  gh_repo_name TEXT
)
LANGUAGE plpgsql
SECURITY definer SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
    SELECT
      p.gh_installation_id,
      p.gh_user_login,
      p.gh_user_id,
      p.gh_avatar_url,
      p.gh_repo_name
    FROM
      public.profiles p
    WHERE
      p.id = $1
    LIMIT 1;
END;
$$;
