-- ─────────────────────────────────────────────────────────────
-- 先生と英文法レッスン（grammar-app） Supabase 設定
--
-- Supabase ダッシュボード > SQL Editor に貼り付けて実行します。
-- 何度実行しても安全です（既存のデータは消えません）。
--
-- このファイルは lib/room-store.ts が使う列名から書き起こしたものです。
-- room-store.ts が参照していた migrations/20260710_grammar_rooms.sql は
-- リポジトリに入っていなかったため、本番のテーブルと列が同じかを
-- 実行前に Table Editor で見比べてください（この環境から本番DBは確認できていません）。
-- ─────────────────────────────────────────────────────────────

-- 1) テーブル（すでにある場合は何もしません）
create table if not exists public.grammar_rooms (
  id                  uuid primary key,
  code                text not null,
  admin_key           text not null,
  mode                text not null default 'choice',
  current_question_id text,
  show_answer         boolean not null default false,
  show_explanation    boolean not null default false,
  status              text not null default 'waiting',
  participants        jsonb not null default '[]'::jsonb,
  answers             jsonb not null default '[]'::jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists grammar_rooms_code_idx on public.grammar_rooms (code);

-- 2) 行レベルセキュリティ（RLS）
--    ポリシーを1つも作らずに RLS を有効にします。こうすると、
--    ブラウザに配られる anon キーでは読むことも書くこともできず、
--    サーバ（Vercel の API）だけが service_role キーで読み書きできます。
--    → 「参加者IDと sessionId の照合」「正答表示後は受け付けない」などの
--      チェックは API（app/api/rooms/[id]/answer/route.ts）を必ず通ることになります。
--    ※ このテーブルには admin_key（講師の鍵）と sessionId（生徒の本人確認用）が
--      入っているので、anon / authenticated 向けのポリシーは追加しないでください。
alter table public.grammar_rooms enable row level security;
revoke all on public.grammar_rooms from anon, authenticated;

-- 3) 同時回答で記録が消えないようにする関数（推奨）
--    answers / participants は1行のJSON列なので、クラス全員が同時に答えると
--    「読む→足す→書く」の間に他の人の回答を上書きして消すことがあります。
--    下の関数は、行をロックして DB の中で1回の更新として追加します。
--    関数が無い場合、アプリは「書いたあと読み直して確認→やり直す」方式で動きます
--    （ほぼ防げますが完全ではなく、1回答あたり約0.5秒遅くなります）。
--    関数を作ると、アプリは自動的にこちらを使います（コードの変更・再デプロイは不要）。

create or replace function public.grammar_room_add_participant(
  p_room_id uuid,
  p_participant jsonb
) returns setof public.grammar_rooms
language plpgsql
security invoker
as $$
begin
  return query
  update public.grammar_rooms r
     set participants = coalesce(r.participants, '[]'::jsonb) || jsonb_build_array(p_participant)
   where r.id = p_room_id
  returning r.*;
end;
$$;

create or replace function public.grammar_room_add_answer(
  p_room_id uuid,
  p_answer jsonb
) returns setof public.grammar_rooms
language plpgsql
security invoker
as $$
begin
  return query
  update public.grammar_rooms r
     set answers = (
           -- 同じ参加者・同じ問題の回答があれば取り除いてから追加する
           select coalesce(jsonb_agg(a), '[]'::jsonb)
             from jsonb_array_elements(coalesce(r.answers, '[]'::jsonb)) as a
            where not (a->>'participantId' = p_answer->>'participantId'
                   and a->>'questionId'    = p_answer->>'questionId')
         ) || jsonb_build_array(p_answer)
   where r.id = p_room_id
  returning r.*;
end;
$$;

-- サーバ（service_role）だけが呼べるようにする
revoke all on function public.grammar_room_add_participant(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.grammar_room_add_answer(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.grammar_room_add_participant(uuid, jsonb) to service_role;
grant execute on function public.grammar_room_add_answer(uuid, jsonb) to service_role;

-- 4) 古いルームの掃除（任意・手動）
--    授業が終わったルームは、必要に応じて次の1行で消せます。
-- delete from public.grammar_rooms where created_at < now() - interval '1 day';
