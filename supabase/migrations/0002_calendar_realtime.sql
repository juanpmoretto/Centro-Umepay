-- Slim public mirror of booking_requests, containing no organizer PII, so the
-- public calendar can subscribe to Realtime changes and read availability
-- without any RLS policy ever exposing organizer contact details.
create table booking_calendar_events (
  id uuid primary key,
  start_date date not null,
  end_date date not null,
  status text not null
);

alter table booking_calendar_events enable row level security;

create or replace function sync_calendar_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from booking_calendar_events where id = old.id;
    return old;
  end if;

  if new.status = 'released' then
    delete from booking_calendar_events where id = new.id;
  else
    insert into booking_calendar_events (id, start_date, end_date, status)
    values (new.id, new.start_date, new.end_date, new.status)
    on conflict (id) do update
      set start_date = excluded.start_date,
          end_date = excluded.end_date,
          status = excluded.status;
  end if;

  return new;
end;
$$;

create trigger booking_calendar_sync
  after insert or update or delete on booking_requests
  for each row execute function sync_calendar_event();
