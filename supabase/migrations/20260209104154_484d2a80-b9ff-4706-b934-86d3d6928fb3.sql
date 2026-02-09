-- Create subtasks table for Phase 2: Subtasks & Checklists
CREATE TABLE public.subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- Create policies for subtasks
CREATE POLICY "Users can view their own subtasks" 
ON public.subtasks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subtasks" 
ON public.subtasks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subtasks" 
ON public.subtasks 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subtasks" 
ON public.subtasks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Enable Realtime for subtasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.subtasks;

-- Add indexes for performance
CREATE INDEX idx_subtasks_item_id ON public.subtasks(item_id);
CREATE INDEX idx_subtasks_user_id ON public.subtasks(user_id);
CREATE INDEX idx_subtasks_sort_order ON public.subtasks(item_id, sort_order);