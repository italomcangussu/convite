import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("migration aplica e RLS separa convidados, contas comuns e administradores", async () => {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth,storage to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key,bucket_id text,name text);
alter table storage.objects enable row level security;
grant select,insert,update,delete on storage.objects to anon,authenticated;`);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261005131122_invitation.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (const migration of ["20261005132536_invitation_permissions.sql", "20261005132636_restrict_internal_rls_function.sql"]) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), "utf8"));
  }
  await db.exec(
    `insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');insert into public.admins values ('11111111-1111-4111-8111-111111111111');set role anon;`,
  );
  assert.equal(
    (await db.query("select * from public.site_settings")).rows.length,
    1,
  );
  await db.exec(
    `insert into public.rsvps(id,family_name) values ('33333333-3333-4333-8333-333333333333','Família Teste');`,
  );
  await assert.rejects(
    () =>
      db.exec(
        `insert into public.rsvps(id,family_name) values ('33333333-3333-4333-8333-333333333333','Família Teste')`,
      ),
    (error: unknown) => (error as { code: string }).code === "23505",
  );
  await assert.rejects(() => db.query("select * from public.rsvps"));
  await assert.rejects(() =>
    db.exec(`update public.site_settings set content='{"name":"intruso"}'`),
  );
  await assert.rejects(() =>
    db.exec(
      `insert into storage.objects values ('44444444-4444-4444-8444-444444444444','soundtracks','bad.mp3')`,
    ),
  );
  await db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);`,
  );
  assert.equal((await db.query("select * from public.rsvps")).rows.length, 0);
  assert.equal(
    (
      await db.query<{ allowed: boolean }>(
        "select public.is_admin() as allowed",
      )
    ).rows[0].allowed,
    false,
  );
  await db.exec(
    `update public.site_settings set content='{"name":"intruso"}';`,
  );
  assert.deepEqual(
    (
      await db.query<{ content: Record<string, unknown> }>(
        "select content from public.site_settings",
      )
    ).rows[0].content,
    {},
  );
  await db.exec(
    `select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);`,
  );
  assert.equal(
    (
      await db.query<{ allowed: boolean }>(
        "select public.is_admin() as allowed",
      )
    ).rows[0].allowed,
    true,
  );
  assert.equal((await db.query("select * from public.rsvps")).rows.length, 1);
  await db.exec(
    `update public.site_settings set content='{"name":"Vicente"}';insert into storage.objects values ('44444444-4444-4444-8444-444444444444','soundtracks','ok.mp3');delete from public.rsvps;`,
  );
  assert.equal((await db.query("select * from public.rsvps")).rows.length, 0);
  assert.deepEqual(
    (
      await db.query<{ content: Record<string, unknown> }>(
        "select content from public.site_settings",
      )
    ).rows[0].content,
    { name: "Vicente" },
  );
  await db.close();
});
