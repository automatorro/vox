-- Create enum for item types
CREATE TYPE public.item_type AS ENUM ('task', 'event', 'reminder');

-- Create enum for priority levels
CREATE TYPE public.priority_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  notification_email_enabled BOOLEAN DEFAULT false,
  notification_push_enabled BOOLEAN DEFAULT true,
  notification_minutes_before INTEGER DEFAULT 15,
  google_calendar_token TEXT,
  google_calendar_token_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create items table
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.item_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  -- Task specific fields
  deadline TIMESTAMPTZ,
  priority public.priority_level DEFAULT 'medium',
  completed BOOLEAN DEFAULT false,
  -- Event specific fields
  start_time TIMESTAMPTZ,
  duration INTEGER, -- in minutes
  synced BOOLEAN DEFAULT false,
  google_id TEXT,
  -- Reminder specific fields
  time TIMESTAMPTZ,
  notified BOOLEAN DEFAULT false,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Items policies
CREATE POLICY "Users can view their own items"
ON public.items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own items"
ON public.items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items"
ON public.items FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items"
ON public.items FOR DELETE
USING (auth.uid() = user_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();