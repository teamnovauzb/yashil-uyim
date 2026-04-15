select telegram_id, username, first_name, is_super, created_at
from admins
order by is_super desc, created_at asc;
