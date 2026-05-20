
CREATE TYPE public.pending_type AS ENUM ('new', 'edit');
CREATE TYPE public.pending_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.pending_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submitter_id UUID NOT NULL,
  submitter_email TEXT NOT NULL DEFAULT '',
  type public.pending_type NOT NULL,
  original_quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  quote TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'ENG',
  status public.pending_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID
);

ALTER TABLE public.pending_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own pending submissions"
  ON public.pending_quotes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitter_id);

CREATE POLICY "Users can view their own pending submissions"
  ON public.pending_quotes FOR SELECT TO authenticated
  USING (auth.uid() = submitter_id);

CREATE POLICY "Admins can view all pending submissions"
  ON public.pending_quotes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pending submissions"
  ON public.pending_quotes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pending submissions"
  ON public.pending_quotes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_pending_quotes_status ON public.pending_quotes(status);
CREATE INDEX idx_pending_quotes_submitter ON public.pending_quotes(submitter_id);
