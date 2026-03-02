
-- Create tags table
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create item_tags junction table
CREATE TABLE public.item_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_tags ENABLE ROW LEVEL SECURITY;

-- Tags RLS policies
CREATE POLICY "Users can view their own tags" ON public.tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tags" ON public.tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tags" ON public.tags FOR DELETE USING (auth.uid() = user_id);

-- Item_tags RLS policies (user must own the tag)
CREATE POLICY "Users can view their own item tags" ON public.item_tags FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tags WHERE tags.id = item_tags.tag_id AND tags.user_id = auth.uid())
);
CREATE POLICY "Users can create their own item tags" ON public.item_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.tags WHERE tags.id = item_tags.tag_id AND tags.user_id = auth.uid())
);
CREATE POLICY "Users can delete their own item tags" ON public.item_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.tags WHERE tags.id = item_tags.tag_id AND tags.user_id = auth.uid())
);
