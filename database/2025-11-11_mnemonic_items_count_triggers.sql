-- Migration: maintain items_count for educational_mnemonics via triggers
-- Date: 2025-11-11

begin;

create or replace function public.update_mnemonic_items_count()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    update public.educational_mnemonics
      set items_count = (select count(*) from public.educational_mnemonic_items where mnemonic_id = new.mnemonic_id)
      where id = new.mnemonic_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.educational_mnemonics
      set items_count = (select count(*) from public.educational_mnemonic_items where mnemonic_id = old.mnemonic_id)
      where id = old.mnemonic_id;
    return old;
  elsif (tg_op = 'UPDATE') then
    if (new.mnemonic_id <> old.mnemonic_id) then
      update public.educational_mnemonics
        set items_count = (select count(*) from public.educational_mnemonic_items where mnemonic_id = old.mnemonic_id)
        where id = old.mnemonic_id;
      update public.educational_mnemonics
        set items_count = (select count(*) from public.educational_mnemonic_items where mnemonic_id = new.mnemonic_id)
        where id = new.mnemonic_id;
    else
      update public.educational_mnemonics
        set items_count = (select count(*) from public.educational_mnemonic_items where mnemonic_id = new.mnemonic_id)
        where id = new.mnemonic_id;
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_mnemonic_items_insert on public.educational_mnemonic_items;
create trigger trg_mnemonic_items_insert
after insert on public.educational_mnemonic_items
for each row execute procedure public.update_mnemonic_items_count();

drop trigger if exists trg_mnemonic_items_delete on public.educational_mnemonic_items;
create trigger trg_mnemonic_items_delete
after delete on public.educational_mnemonic_items
for each row execute procedure public.update_mnemonic_items_count();

drop trigger if exists trg_mnemonic_items_update on public.educational_mnemonic_items;
create trigger trg_mnemonic_items_update
after update on public.educational_mnemonic_items
for each row execute procedure public.update_mnemonic_items_count();

commit;