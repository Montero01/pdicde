-- Aplicado via migração academy_notification_inbox_24h. Retenção individual, sem apagar avisos de outros usuários.
create or replace function public.academy_notification_inbox()
returns jsonb language sql stable security invoker set search_path=pg_catalog as $$
 with inbox as materialized (
  select n.id,n.title,n.message,n.created_at,n.created_by_name,r.read_at,
   r.read_at+interval '24 hours' as expires_at,
   case when r.read_at is null then null else greatest(0,ceil(extract(epoch from (r.read_at+interval '24 hours'-statement_timestamp()))*1000))::bigint end as expires_in_ms
  from public.academy_notifications n
  left join public.academy_notification_reads r on r.notification_id=n.id and r.user_id=auth.uid()
  where auth.uid() is not null and (r.read_at is null or r.read_at+interval '24 hours'>statement_timestamp())
 )
 select jsonb_build_object('server_now',statement_timestamp(),'unread_count',(select count(*) from inbox where read_at is null),
  'rows',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id) from(select *from inbox order by created_at desc,id limit 50)x),'[]'::jsonb));
$$;
revoke all on function public.academy_notification_inbox() from public,anon;
grant execute on function public.academy_notification_inbox() to authenticated;

create or replace function public.academy_notifications_mark_opened(p_ids uuid[])
returns jsonb language plpgsql security invoker set search_path=pg_catalog as $$
declare marked integer;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária.' using errcode='42501';end if;
 if coalesce(cardinality(p_ids),0)>50 then raise exception 'Abra até 50 notificações por vez.' using errcode='22023';end if;
 insert into public.academy_notification_reads as receipt(notification_id,user_id,read_at)
 select n.id,auth.uid(),statement_timestamp() from public.academy_notifications n where n.id=any(coalesce(p_ids,'{}'::uuid[]))
 on conflict(notification_id,user_id) do update set read_at=excluded.read_at where receipt.read_at is null;
 get diagnostics marked=row_count;
 return jsonb_build_object('marked',marked);
end;
$$;
revoke all on function public.academy_notifications_mark_opened(uuid[]) from public,anon;
grant execute on function public.academy_notifications_mark_opened(uuid[]) to authenticated;
notify pgrst,'reload schema';
