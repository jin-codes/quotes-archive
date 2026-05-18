
-- 1. Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Auto-grant admin role to the designated email (now + on future signups)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'seojin1448@naver.com'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.assign_admin_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'seojin1448@naver.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_admin_on_signup_trigger
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.assign_admin_on_signup();

-- 3. Quotes: language column + drop per-user fields meaning
ALTER TABLE public.quotes
  ADD COLUMN language text NOT NULL DEFAULT 'ENG' CHECK (language IN ('ENG','KOR'));

UPDATE public.quotes
SET language = CASE
  WHEN quote ~ '[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]' THEN 'KOR'
  ELSE 'ENG'
END;

ALTER TABLE public.quotes DROP COLUMN favorite;
ALTER TABLE public.quotes ALTER COLUMN user_id DROP NOT NULL;

-- 4. Replace quotes RLS: public read, admin write
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can insert their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can delete their own quotes" ON public.quotes;

CREATE POLICY "Anyone can view quotes"
  ON public.quotes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert quotes"
  ON public.quotes FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update quotes"
  ON public.quotes FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete quotes"
  ON public.quotes FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. User favorites
CREATE TABLE public.user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quote_id)
);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites"
  ON public.user_favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites"
  ON public.user_favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites"
  ON public.user_favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX user_favorites_user_idx ON public.user_favorites(user_id);
