// Real PostgreSQL/PLpgSQL semantics in isolated WASM memory; no server/network/PII.
// PGLITE_MODULE may point to a separately installed QA dependency (production unchanged).
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const rawSql=readFileSync(new URL('../prisma/sql/20261029_auth_session_audit.sql',import.meta.url),'utf8');
// Reuse policy logic with a synthetic owner value, never load real user records.
const sql=rawSql.replace(/lower\(btrim\(u\.email\)\) = '[^']+'/g,"lower(btrim(u.email)) = 'owner@example.test'");
const manifest=JSON.parse(readFileSync(new URL('../prisma/auth-session-source-manifest.json',import.meta.url),'utf8'));
let db;
const idFor=id=>createHash('md5').update('adseeq:AuthSession:'+id).digest('hex');
const insert=(id,user='member')=>db.query('INSERT INTO public."AuthSession"(id,"userId","tokenHash","expiresAt") VALUES($1,$2,$3,now()+interval \'30 days\')',[id,user,'synthetic-hash-'+id]);
const event=async id=>(await db.query('SELECT * FROM public.abone_session_events WHERE event_id=$1',[idFor(id)])).rows;
before(async()=>{
 db=new PGlite();
 await db.exec('CREATE TABLE public."User"(id TEXT PRIMARY KEY,email TEXT NOT NULL,role TEXT NOT NULL); CREATE TABLE public."AuthSession"(id TEXT PRIMARY KEY,"userId" TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,"tokenHash" TEXT NOT NULL UNIQUE,"expiresAt" TIMESTAMP(3) NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now());');
 await db.exec("INSERT INTO public.\"User\" VALUES ('member','member@example.test','USER'),('admin','admin@example.test','ADMIN'),('owner','OWNER@example.test','USER'),('delete-me','remove@example.test','USER')");
 await insert('before-install');
 await db.exec(sql);
});
after(async()=>{await db.close();});
test('migration starts a future epoch without manufacturing historical evidence',async()=>{
 assert.equal((await event('before-install')).length,0);
 const m=(await db.query('SELECT * FROM public.abone_session_coverage')).rows[0];assert.equal(m.id,1);assert.equal(m.auth_source_sha256,manifest.authSourceSha256);assert.equal(m.audit_window_days,32);assert.equal(m.evidence_kind,'session_persisted');assert.ok(new Date(m.installed_at).getTime()<=Date.now());
});
test('committed session is recorded atomically, then survives logout and user cascade',async()=>{
 await insert('persisted');let rows=await event('persisted');assert.equal(rows.length,1);assert.equal(rows[0].actor_id,'member');assert.equal(rows[0].excluded,false);
 await db.query('UPDATE public."AuthSession" SET "expiresAt"=now() WHERE id=$1',['persisted']);assert.equal((await event('persisted')).length,1);
 await db.query('DELETE FROM public."AuthSession" WHERE id=$1',['persisted']);assert.equal((await event('persisted')).length,1);
 await insert('user-cascade','delete-me');await db.query('DELETE FROM public."User" WHERE id=$1',['delete-me']);assert.equal((await event('user-cascade')).length,1);
 const fks=await db.query("SELECT count(*)::int AS count FROM pg_constraint WHERE conrelid='public.abone_session_events'::regclass AND contype='f'");assert.equal(fks.rows[0].count,0);
});
test('outer rollback and failed FK leave no journal row',async()=>{
 await db.exec('BEGIN');await insert('rolled-back');assert.equal((await event('rolled-back')).length,1);await db.exec('ROLLBACK');assert.equal((await event('rolled-back')).length,0);
 await assert.rejects(insert('bad-user','nonexistent'));assert.equal((await event('bad-user')).length,0);
});
test('journal error rolls back the session instead of silently losing its evidence',async()=>{
 await db.exec("CREATE FUNCTION public.synthetic_journal_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $$; CREATE TRIGGER synthetic_failure BEFORE INSERT ON public.abone_session_events FOR EACH ROW EXECUTE FUNCTION public.synthetic_journal_failure()");
 await assert.rejects(insert('journal-failed'));assert.equal((await event('journal-failed')).length,0);assert.equal((await db.query('SELECT id FROM public."AuthSession" WHERE id=$1',['journal-failed'])).rows.length,0);
 await db.exec('DROP TRIGGER synthetic_failure ON public.abone_session_events; DROP FUNCTION public.synthetic_journal_failure()');
});
test('owner and platform admin exclusion is fixed at issuance, no arbitrary domain filter',async()=>{
 await insert('admin-entry','admin');await insert('owner-entry','owner');assert.equal((await event('admin-entry'))[0].excluded,true);assert.equal((await event('owner-entry'))[0].excluded,true);
 await db.query('UPDATE public."User" SET role=$1 WHERE id=$2',['USER','admin']);assert.equal((await event('admin-entry'))[0].excluded,true);
 await db.exec("INSERT INTO public.\"User\" VALUES ('ordinary','ordinary@example.test','USER')");await insert('ordinary-entry','ordinary');assert.equal((await event('ordinary-entry'))[0].excluded,false);
});
test('journal stores no session token/hash; stable surrogate deduplicates retained sessions',async()=>{
 const columns=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='abone_session_events' ORDER BY ordinal_position")).rows.map(r=>r.column_name);assert.deepEqual(columns,['event_id','actor_id','at','excluded']);
 const rows=await event('persisted');assert.equal(rows[0].event_id,idFor('persisted'));assert.ok(!JSON.stringify(rows).includes('synthetic-hash'));
 await insert('persisted');assert.equal((await event('persisted')).length,1);
});
test('fingerprints match live function/trigger and rerun preserves the original epoch',async()=>{
 const before=(await db.query('SELECT installed_at FROM public.abone_session_coverage')).rows[0].installed_at;
 const proof=(await db.query("SELECT c.writer_md5=md5(pg_get_functiondef('public.abone_capture_auth_session()'::regprocedure)) AS writer_ok,c.trigger_md5=md5(pg_get_triggerdef(t.oid)) AS trigger_ok,t.tgenabled,c.installed_at FROM public.abone_session_coverage c JOIN pg_trigger t ON t.tgrelid='public.\"AuthSession\"'::regclass AND t.tgname='abone_auth_session_insert'")).rows[0];assert.equal(proof.writer_ok,true);assert.equal(proof.trigger_ok,true);assert.equal(proof.tgenabled,'O');
 await db.exec(sql);assert.equal((await db.query('SELECT installed_at FROM public.abone_session_coverage')).rows[0].installed_at.getTime(),before.getTime());assert.equal((await event('persisted')).length,1);
});
test('new capture time is a DB instant independent of session timezone',async()=>{
 await db.exec("SET TIME ZONE 'Europe/Istanbul'");const before=Date.now();await insert('timezone-entry');const stamp=new Date((await event('timezone-entry'))[0].at).getTime();assert.ok(stamp>=before-1000&&stamp<=Date.now()+1000);await db.exec("SET TIME ZONE 'UTC'");
});
test('schema models preserve audit tables under Prisma db push; SQL adds no grants/extensions/backfill',()=>{
 const schema=readFileSync(new URL('../prisma/schema.prisma',import.meta.url),'utf8');assert.match(schema,/@@map\("abone_session_events"\)/);assert.match(schema,/@@map\("abone_session_coverage"\)/);assert.doesNotMatch(sql,/\bGRANT\s|CREATE EXTENSION|INSERT INTO public\.abone_session_events[^;]+SELECT[^;]+FROM public\."AuthSession"/i);
});


test('manifest binds the audited auth helper and all three issuer paths to current source',()=>{
 const combined=createHash('sha256');
 for(const [file,expected] of Object.entries(manifest.files)){
  const bytes=readFileSync(new URL('../'+file,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),expected);
  combined.update(file).update('\0').update(bytes).update('\0');
 }
 assert.equal(combined.digest('hex'),manifest.authSourceSha256);
});


test('capture timestamp follows a delayed insert instead of its old statement start',async()=>{
 const row=(await db.query(`INSERT INTO public."AuthSession"(id,"userId","tokenHash","expiresAt")
 SELECT 'delayed-entry','member','synthetic-delayed-hash',now()+interval '30 days'
 FROM (SELECT pg_sleep(0.02)) delayed RETURNING statement_timestamp() AS statement_start`)).rows[0];
 const at=(await event('delayed-entry'))[0].at;
 assert.ok(new Date(at).getTime()-new Date(row.statement_start).getTime()>=10);
 assert.match(sql,/LOCK TABLE public\."AuthSession" IN SHARE ROW EXCLUSIVE MODE/);
});
