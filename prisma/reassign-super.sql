-- Remove the old super admin from the admins table.
-- 543847007 stays; code hardcodes it as the sole super admin.
delete from admins where telegram_id = 5803735374;

-- Clear stale is_super flags; hierarchy is now code-driven.
update admins set is_super = false;
