-- Additive future session evidence. Execute as the existing application DB role.
-- No grants, extensions, credential values, session tokens or historical backfill.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';
-- Install boundary waits for pre-existing session writes and blocks new ones.
LOCK TABLE public."AuthSession" IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE IF NOT EXISTS public.abone_session_events (
  event_id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  at TIMESTAMPTZ(3) NOT NULL,
  excluded BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS abone_session_events_at_idx ON public.abone_session_events(at);

CREATE TABLE IF NOT EXISTS public.abone_session_coverage (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id=1),
  installed_at TIMESTAMPTZ(3) NOT NULL,
  auth_source_sha256 TEXT NOT NULL,
  auth_source_revision TEXT NOT NULL,
  writer_md5 TEXT NOT NULL,
  trigger_md5 TEXT NOT NULL,
  audit_window_days INTEGER NOT NULL DEFAULT 32 CHECK (audit_window_days=32),
  evidence_kind TEXT NOT NULL DEFAULT 'session_persisted'
);

CREATE OR REPLACE FUNCTION public.abone_capture_auth_session()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $capture$
DECLARE
  is_excluded BOOLEAN;
BEGIN
  -- Role is platform ADMIN in this app, not a customer/tenant administrator.
  -- The owner predicate matches the existing Abone exporter, fixed at write time.
  SELECT (u.role::text = 'ADMIN' OR lower(btrim(u.email)) = 'hikmet044@gmail.com')
    INTO is_excluded FROM public."User" u WHERE u.id = NEW."userId";
  INSERT INTO public.abone_session_events(event_id,actor_id,at,excluded)
  VALUES (md5('adseeq:AuthSession:' || NEW.id), NEW."userId", clock_timestamp(), COALESCE(is_excluded,TRUE))
  ON CONFLICT (event_id) DO NOTHING;
  -- Deliberately no EXCEPTION/fail-open: a journal failure aborts the same
  -- AuthSession insert, so a committed session cannot silently lose its evidence.
  RETURN NEW;
END;
$capture$;

DROP TRIGGER IF EXISTS abone_auth_session_insert ON public."AuthSession";
CREATE TRIGGER abone_auth_session_insert
AFTER INSERT ON public."AuthSession"
FOR EACH ROW EXECUTE FUNCTION public.abone_capture_auth_session();

INSERT INTO public.abone_session_coverage(
 id,installed_at,auth_source_sha256,auth_source_revision,writer_md5,trigger_md5,audit_window_days,evidence_kind
)
SELECT 1,clock_timestamp(),'71eef4e45acf6b5e0d93d6e8e385c71a3561118326d1792bfecce91c180e1787','ebbebb87147a6ee1241a22f95753ff9c0929d811',
 md5(pg_get_functiondef('public.abone_capture_auth_session()'::regprocedure)),
 md5(pg_get_triggerdef(t.oid)),32,'session_persisted'
FROM pg_trigger t
WHERE t.tgrelid='public."AuthSession"'::regclass AND t.tgname='abone_auth_session_insert'
ON CONFLICT(id) DO UPDATE SET
 installed_at=CASE WHEN abone_session_coverage.auth_source_sha256=EXCLUDED.auth_source_sha256
                    AND abone_session_coverage.writer_md5=EXCLUDED.writer_md5
                    AND abone_session_coverage.trigger_md5=EXCLUDED.trigger_md5
                  THEN abone_session_coverage.installed_at ELSE EXCLUDED.installed_at END,
 auth_source_sha256=EXCLUDED.auth_source_sha256,
 auth_source_revision=EXCLUDED.auth_source_revision,
 writer_md5=EXCLUDED.writer_md5,trigger_md5=EXCLUDED.trigger_md5,
 audit_window_days=EXCLUDED.audit_window_days,evidence_kind=EXCLUDED.evidence_kind;
COMMIT;
