-- Add registration_number to members and auto-generate per tenant on insert.
-- Pattern: M-YYYY-#### (sequential per tenant per year)

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS registration_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS members_tenant_registration_unique
  ON public.members (tenant_id, registration_number)
  WHERE registration_number IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_member_registration_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT := to_char(now(), 'YYYY');
  v_seq  INT;
  v_code TEXT;
BEGIN
  IF NEW.registration_number IS NOT NULL AND NEW.registration_number <> '' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(registration_number, '^M-' || v_year || '-', ''), '')::INT
  ), 0) + 1
  INTO v_seq
  FROM public.members
  WHERE tenant_id = NEW.tenant_id
    AND registration_number LIKE 'M-' || v_year || '-%';

  v_code := 'M-' || v_year || '-' || lpad(v_seq::TEXT, 4, '0');
  NEW.registration_number := v_code;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_members_registration_number ON public.members;
CREATE TRIGGER trg_members_registration_number
  BEFORE INSERT ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_member_registration_number();

-- Backfill existing rows missing a registration number, per tenant per join year.
DO $$
DECLARE
  r RECORD;
  v_year TEXT;
  v_seq INT;
BEGIN
  FOR r IN
    SELECT id, tenant_id, COALESCE(created_at, now()) AS ts
    FROM public.members
    WHERE registration_number IS NULL
    ORDER BY tenant_id, created_at
  LOOP
    v_year := to_char(r.ts, 'YYYY');
    SELECT COALESCE(MAX(
      NULLIF(regexp_replace(registration_number, '^M-' || v_year || '-', ''), '')::INT
    ), 0) + 1
    INTO v_seq
    FROM public.members
    WHERE tenant_id = r.tenant_id
      AND registration_number LIKE 'M-' || v_year || '-%';

    UPDATE public.members
       SET registration_number = 'M-' || v_year || '-' || lpad(v_seq::TEXT, 4, '0')
     WHERE id = r.id;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
