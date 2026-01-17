-- Enable realtime for items table so all changes sync instantly across all views
ALTER PUBLICATION supabase_realtime ADD TABLE public.items;