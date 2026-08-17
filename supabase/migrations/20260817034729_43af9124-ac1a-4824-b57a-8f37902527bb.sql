CREATE TABLE public.prop_requests (
  id BIGSERIAL PRIMARY KEY,
  request_code TEXT NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'Catalog',
  prop_id BIGINT REFERENCES public.props(id) ON DELETE SET NULL,
  prop_title TEXT NOT NULL DEFAULT '',
  custom_description TEXT NOT NULL DEFAULT '',
  reference_image_urls TEXT[] NOT NULL DEFAULT '{}',
  production_house TEXT NOT NULL DEFAULT '',
  contact_person TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  shoot_start_date DATE,
  shoot_wrap_date DATE,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.prop_requests TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.prop_requests_id_seq TO service_role;

ALTER TABLE public.prop_requests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER prop_requests_touch BEFORE UPDATE ON public.prop_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();