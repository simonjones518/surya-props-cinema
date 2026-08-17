-- Lock down sensitive tables: all app access goes through the trusted server (service role)
REVOKE ALL ON public.bookings FROM anon, authenticated;
REVOKE ALL ON public.clients FROM anon, authenticated;
REVOKE ALL ON public.invoices FROM anon, authenticated;
REVOKE ALL ON public.prop_requests FROM anon, authenticated;
REVOKE ALL ON public.rental_orders FROM anon, authenticated;

GRANT ALL ON public.bookings TO service_role;
GRANT ALL ON public.clients TO service_role;
GRANT ALL ON public.invoices TO service_role;
GRANT ALL ON public.prop_requests TO service_role;
GRANT ALL ON public.rental_orders TO service_role;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prop_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE public.prop_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rental_orders FORCE ROW LEVEL SECURITY;

-- Explicit default-deny policies so no client role can read or write these tables
DROP POLICY IF EXISTS "Deny all client access to bookings" ON public.bookings;
CREATE POLICY "Deny all client access to bookings" ON public.bookings
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny all client access to clients" ON public.clients;
CREATE POLICY "Deny all client access to clients" ON public.clients
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny all client access to invoices" ON public.invoices;
CREATE POLICY "Deny all client access to invoices" ON public.invoices
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny all client access to prop_requests" ON public.prop_requests;
CREATE POLICY "Deny all client access to prop_requests" ON public.prop_requests
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny all client access to rental_orders" ON public.rental_orders;
CREATE POLICY "Deny all client access to rental_orders" ON public.rental_orders
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Storage: block all direct client access to the private prop-images bucket
DROP POLICY IF EXISTS "Deny client reads on prop-images" ON storage.objects;
CREATE POLICY "Deny client reads on prop-images" ON storage.objects
  FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "Deny client uploads on prop-images" ON storage.objects;
CREATE POLICY "Deny client uploads on prop-images" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "Deny client updates on prop-images" ON storage.objects;
CREATE POLICY "Deny client updates on prop-images" ON storage.objects
  FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny client deletes on prop-images" ON storage.objects;
CREATE POLICY "Deny client deletes on prop-images" ON storage.objects
  FOR DELETE TO anon, authenticated USING (false);