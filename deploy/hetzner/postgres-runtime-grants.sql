\set ON_ERROR_STOP on
-- Connect as yashiluyim_migrator to the new database after EVERY schema migration.
SELECT 1 / CASE WHEN current_database()='yashiluyim' AND current_user='yashiluyim_migrator' THEN 1 ELSE 0 END AS grants_preconditions;
BEGIN;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO yashiluyim_app;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO yashiluyim_app;
ALTER DEFAULT PRIVILEGES FOR ROLE yashiluyim_migrator IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO yashiluyim_app;
ALTER DEFAULT PRIVILEGES FOR ROLE yashiluyim_migrator IN SCHEMA public GRANT USAGE,SELECT ON SEQUENCES TO yashiluyim_app;
REVOKE ALL ON schema_migrations FROM yashiluyim_app;
GRANT SELECT ON schema_migrations TO yashiluyim_app;
COMMIT;
