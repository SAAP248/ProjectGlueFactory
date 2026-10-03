/*
# Customer-facing Estimate and Proposal views

Lets each estimate be shared with a customer through a private link, displayed either as a
single-page estimate or as a multi-page proposal book, with a Q&A thread and file sharing.

1. Modified Tables
- `estimates`
  - `public_token` (text, unique) - private, hard-to-guess customer link code
  - `view_mode` (text, 'estimate' | 'proposal') - how the customer sees it
  - `viewed_at` / `last_viewed_at` (timestamptz) - first and latest customer view
  - `signature_type` (text, 'typed' | 'drawn') and `signature_data` (drawn signature image)
  - `cover_title`, `cover_image_url`, `scope_of_work` (text) - per-estimate proposal content
- `proposal_messages`
  - `attachment_path`, `attachment_name`, `attachment_type`, `attachment_size` - optional file on a message
  - `read_at` (timestamptz) - when staff read a customer message

2. Data backfill
- Every existing estimate gets a private link code.
- Estimates linked to a deal default to the proposal view and inherit the deal's scope of work.
- Default proposal content (About Us, highlights, terms, images) is added to app settings.

3. Customer functions (SECURITY DEFINER, keyed by the private link code)
- `get_customer_estimate(token)` - returns only customer-safe fields (no internal costs)
- `mark_estimate_viewed(token)` - records views
- `respond_to_estimate(...)` - accept (typed/drawn signature) or decline; locked after a response and when expired
- `list_estimate_messages(token)` / `post_estimate_message(...)` - Q&A thread; customer posts are always marked as customer
- `resolve_deal_proposal(deal_token)` - keeps older deal proposal links working

4. Storage
- Private `estimate-files` bucket, 10 MB limit, images/PDF/Office documents only.
- Uploads must go into a folder named after an existing estimate. No overwrite or delete.

5. Realtime
- `proposal_messages` added to the realtime publication so new messages appear instantly.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estimates' AND column_name='public_token') THEN
    ALTER TABLE estimates ADD COLUMN public_token text DEFAULT replace(gen_random_uuid()::text,'-','') || substr(replace(gen_random_uuid()::text,'-',''),1,8);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estimates' AND column_name='view_mode') THEN
    ALTER TABLE estimates ADD COLUMN view_mode text NOT NULL DEFAULT 'estimate' CHECK (view_mode IN ('estimate','proposal'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estimates' AND column_name='viewed_at') THEN
    ALTER TABLE estimates ADD COLUMN viewed_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estimates' AND column_name='last_viewed_at') THEN
    ALTER TABLE estimates ADD COLUMN last_viewed_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estimates' AND column_name='signature_type') THEN
    ALTER TABLE estimates ADD COLUMN signature_type text CHECK (signature_type IN ('typed','drawn'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estimates' AND column_name='signature_data') THEN
    ALTER TABLE estimates ADD COLUMN signature_data text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estimates' AND column_name='cover_title') THEN
    ALTER TABLE estimates ADD COLUMN cover_title text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estimates' AND column_name='cover_image_url') THEN
    ALTER TABLE estimates ADD COLUMN cover_image_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estimates' AND column_name='scope_of_work') THEN
    ALTER TABLE estimates ADD COLUMN scope_of_work text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposal_messages' AND column_name='attachment_path') THEN
    ALTER TABLE proposal_messages ADD COLUMN attachment_path text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposal_messages' AND column_name='attachment_name') THEN
    ALTER TABLE proposal_messages ADD COLUMN attachment_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposal_messages' AND column_name='attachment_type') THEN
    ALTER TABLE proposal_messages ADD COLUMN attachment_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposal_messages' AND column_name='attachment_size') THEN
    ALTER TABLE proposal_messages ADD COLUMN attachment_size bigint;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposal_messages' AND column_name='read_at') THEN
    ALTER TABLE proposal_messages ADD COLUMN read_at timestamptz;
  END IF;
END $$;

UPDATE estimates SET public_token = replace(gen_random_uuid()::text,'-','') || substr(replace(gen_random_uuid()::text,'-',''),1,8)
WHERE public_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS estimates_public_token_key ON estimates(public_token);
CREATE INDEX IF NOT EXISTS proposal_messages_estimate_idx ON proposal_messages(estimate_id, created_at);

UPDATE estimates e SET view_mode = 'proposal', scope_of_work = COALESCE(e.scope_of_work, d.scope_of_work)
FROM deals d WHERE e.deal_id = d.id AND e.view_mode = 'estimate' AND e.viewed_at IS NULL AND e.cover_title IS NULL;

INSERT INTO app_settings (key, value) VALUES
  ('proposal_tagline', 'Security, automation and life-safety systems designed and installed by certified professionals.'),
  ('proposal_about_us', E'For more than two decades we have protected the homes and businesses in our community. Our licensed technicians design, install and monitor every system we sell, so there is one team accountable from the first walkthrough to the last service call.\n\nWe believe great technology should be simple to live with. Every project includes hands-on training, clear documentation and a local support team that answers the phone.'),
  ('proposal_highlights', E'20+ years in business\nLicensed & insured technicians\n24/7 UL-listed monitoring\nLocal service team'),
  ('proposal_terms', E'1. Payment: 50% deposit due at acceptance; balance due upon completion.\n2. Warranty: Equipment carries the manufacturer warranty. Labor is warranted for one (1) year from installation.\n3. Scheduling: Installation will be scheduled within 10 business days of acceptance, subject to equipment availability.\n4. Changes: Any change to the scope of work must be approved in writing and may affect price and schedule.\n5. Access: Customer agrees to provide reasonable access to the site during working hours.\n6. Validity: This estimate is valid until the expiration date shown.'),
  ('proposal_cover_image', 'https://images.pexels.com/photos/4626268/pexels-photo-4626268.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('proposal_about_image', 'https://images.pexels.com/photos/5966513/pexels-photo-5966513.jpeg?auto=compress&cs=tinysrgb&h=650&w=940')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION get_customer_estimate(p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE e estimates%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN RETURN NULL; END IF;
  SELECT * INTO e FROM estimates WHERE public_token = p_token;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'estimate', jsonb_build_object(
      'id', e.id, 'estimate_number', e.estimate_number, 'status', e.status, 'view_mode', e.view_mode,
      'estimate_date', e.estimate_date, 'expiration_date', e.expiration_date,
      'subtotal', e.subtotal, 'tax', e.tax, 'total', e.total, 'notes', e.notes,
      'terms', e.terms, 'grouping_mode', e.grouping_mode, 'scope_of_work', e.scope_of_work,
      'cover_title', e.cover_title, 'cover_image_url', e.cover_image_url,
      'accepted_at', e.accepted_at, 'declined_at', e.declined_at, 'declined_reason', e.declined_reason,
      'customer_name_signed', e.customer_name_signed, 'signature_type', e.signature_type,
      'signature_data', e.signature_data),
    'company', (SELECT jsonb_build_object('name', c.name, 'billing_address', c.billing_address,
      'billing_city', c.billing_city, 'billing_state', c.billing_state, 'billing_zip', c.billing_zip)
      FROM companies c WHERE c.id = e.company_id),
    'site', (SELECT jsonb_build_object('name', s.name, 'address', s.address, 'city', s.city, 'state', s.state, 'zip', s.zip)
      FROM sites s WHERE s.id = e.site_id),
    'deal_title', (SELECT d.title FROM deals d WHERE d.id = e.deal_id),
    'line_items', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', li.id, 'description', li.description,
      'quantity', li.quantity, 'unit_price', li.unit_price, 'system_group_id', li.system_group_id, 'room_id', li.room_id)
      ORDER BY li.sort_order NULLS LAST, li.created_at) FROM estimate_line_items li WHERE li.estimate_id = e.id), '[]'::jsonb),
    'systems', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', ds.id, 'name', ds.name) ORDER BY ds.sort_order)
      FROM deal_systems ds WHERE e.deal_id IS NOT NULL AND ds.deal_id = e.deal_id), '[]'::jsonb),
    'rooms', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name) ORDER BY r.sort_order)
      FROM proposal_rooms r WHERE r.estimate_id = e.id), '[]'::jsonb),
    'business', (SELECT jsonb_build_object('name', cp.name, 'address', cp.address, 'city', cp.city, 'state', cp.state,
      'zip', cp.zip, 'phone', cp.phone, 'license_number', cp.license_number) FROM company_profile cp ORDER BY cp.created_at LIMIT 1),
    'settings', COALESCE((SELECT jsonb_object_agg(a.key, a.value) FROM app_settings a WHERE a.key LIKE 'proposal\_%'), '{}'::jsonb)
  );
END $$;

CREATE OR REPLACE FUNCTION mark_estimate_viewed(p_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE estimates SET viewed_at = COALESCE(viewed_at, now()), last_viewed_at = now(),
    status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END
  WHERE public_token = p_token AND length(p_token) >= 16;
END $$;

CREATE OR REPLACE FUNCTION respond_to_estimate(p_token text, p_action text, p_name text, p_email text,
  p_signature_type text, p_signature_data text, p_reason text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e estimates%ROWTYPE;
BEGIN
  SELECT * INTO e FROM estimates WHERE public_token = p_token AND length(p_token) >= 16 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF e.status IN ('approved','declined') THEN RAISE EXCEPTION 'already_responded'; END IF;
  IF e.expiration_date IS NOT NULL AND e.expiration_date < current_date THEN RAISE EXCEPTION 'expired'; END IF;

  IF p_action = 'accept' THEN
    IF p_name IS NULL OR length(trim(p_name)) < 2 OR length(p_name) > 120 THEN RAISE EXCEPTION 'invalid_name'; END IF;
    IF p_signature_type IS NULL OR p_signature_type NOT IN ('typed','drawn') THEN RAISE EXCEPTION 'invalid_signature'; END IF;
    IF p_signature_type = 'drawn' AND (p_signature_data IS NULL OR p_signature_data NOT LIKE 'data:image/png;base64,%'
      OR length(p_signature_data) > 400000) THEN RAISE EXCEPTION 'invalid_signature'; END IF;
    UPDATE estimates SET status = 'approved', accepted_at = now(), customer_name_signed = trim(p_name),
      customer_email_signed = NULLIF(trim(left(COALESCE(p_email,''), 200)), ''),
      signature_type = p_signature_type,
      signature_data = CASE WHEN p_signature_type = 'drawn' THEN p_signature_data END,
      declined_at = NULL, declined_reason = NULL, updated_at = now()
    WHERE id = e.id;
  ELSIF p_action = 'decline' THEN
    UPDATE estimates SET status = 'declined', declined_at = now(),
      declined_reason = NULLIF(trim(left(COALESCE(p_reason,''), 1000)), ''), updated_at = now()
    WHERE id = e.id;
  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION list_estimate_messages(p_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', m.id, 'sender_type', m.sender_type, 'sender_name', m.sender_name,
    'message', m.message, 'reference_type', m.reference_type, 'reference_label', m.reference_label,
    'attachment_path', m.attachment_path, 'attachment_name', m.attachment_name, 'attachment_type', m.attachment_type,
    'attachment_size', m.attachment_size, 'created_at', m.created_at) ORDER BY m.created_at), '[]'::jsonb)
  FROM proposal_messages m JOIN estimates e ON e.id = m.estimate_id
  WHERE e.public_token = p_token AND length(p_token) >= 16;
$$;

CREATE OR REPLACE FUNCTION post_estimate_message(p_token text, p_name text, p_message text,
  p_reference_type text, p_reference_id uuid, p_reference_label text,
  p_attachment_path text, p_attachment_name text, p_attachment_type text, p_attachment_size bigint)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e_id uuid; new_id uuid;
BEGIN
  SELECT id INTO e_id FROM estimates WHERE public_token = p_token AND length(p_token) >= 16;
  IF e_id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF p_name IS NULL OR length(trim(p_name)) < 1 OR length(p_name) > 120 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF length(COALESCE(p_message,'')) > 4000 THEN RAISE EXCEPTION 'message_too_long'; END IF;
  IF COALESCE(trim(p_message),'') = '' AND p_attachment_path IS NULL THEN RAISE EXCEPTION 'empty_message'; END IF;
  IF p_reference_type IS NOT NULL AND p_reference_type NOT IN ('product','room','system') THEN RAISE EXCEPTION 'invalid_reference'; END IF;
  IF p_attachment_path IS NOT NULL THEN
    IF p_attachment_path NOT LIKE e_id::text || '/%' OR COALESCE(p_attachment_size, 0) > 10485760
      OR NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'estimate-files' AND o.name = p_attachment_path)
    THEN RAISE EXCEPTION 'invalid_attachment'; END IF;
  END IF;
  INSERT INTO proposal_messages (estimate_id, sender_type, sender_name, message, reference_type, reference_id, reference_label,
    attachment_path, attachment_name, attachment_type, attachment_size)
  VALUES (e_id, 'customer', trim(p_name), COALESCE(trim(p_message),''), p_reference_type, p_reference_id,
    left(p_reference_label, 200), p_attachment_path, left(p_attachment_name, 200), left(p_attachment_type, 100), p_attachment_size)
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION resolve_deal_proposal(p_deal_token text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.public_token FROM estimates e JOIN deals d ON d.id = e.deal_id
  WHERE d.proposal_token = p_deal_token AND length(p_deal_token) >= 8
  ORDER BY e.created_at DESC LIMIT 1;
$$;

REVOKE ALL ON FUNCTION get_customer_estimate(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION mark_estimate_viewed(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION respond_to_estimate(text,text,text,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION list_estimate_messages(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION post_estimate_message(text,text,text,text,uuid,text,text,text,text,bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION resolve_deal_proposal(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_customer_estimate(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mark_estimate_viewed(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION respond_to_estimate(text,text,text,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION list_estimate_messages(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION post_estimate_message(text,text,text,text,uuid,text,text,text,text,bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION resolve_deal_proposal(text) TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('estimate-files', 'estimate-files', false, 10485760, ARRAY[
  'image/png','image/jpeg','image/gif','image/webp','image/heic','application/pdf','text/plain','text/csv',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "estimate_files_select" ON storage.objects;
CREATE POLICY "estimate_files_select" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'estimate-files');

DROP POLICY IF EXISTS "estimate_files_insert" ON storage.objects;
CREATE POLICY "estimate_files_insert" ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'estimate-files'
  AND EXISTS (SELECT 1 FROM public.estimates e WHERE e.id::text = (storage.foldername(name))[1])
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'proposal_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE proposal_messages;
  END IF;
END $$;
