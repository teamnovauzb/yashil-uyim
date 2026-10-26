\set ON_ERROR_STOP on
-- Run once as the existing cluster administrator. Refuse to take over any existing role/database.
-- psql reads the passwords from the process environment, not command-line arguments.
\getenv migrator_password YASHILUYIM_MIGRATOR_PASSWORD
\getenv app_password YASHILUYIM_APP_PASSWORD
SELECT 1 / CASE WHEN :'migrator_password' ~ '^[a-f0-9]{64}$'
  AND :'app_password' ~ '^[a-f0-9]{64}$' AND :'migrator_password' <> :'app_password'
  AND NOT EXISTS(SELECT FROM pg_roles WHERE rolname IN ('yashiluyim_migrator','yashiluyim_app'))
  AND NOT EXISTS(SELECT FROM pg_database WHERE datname='yashiluyim') THEN 1 ELSE 0 END AS bootstrap_preconditions;
BEGIN;
SET LOCAL password_encryption='scram-sha-256';
CREATE ROLE yashiluyim_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 5 PASSWORD :'migrator_password';
CREATE ROLE yashiluyim_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 24 PASSWORD :'app_password';
COMMIT;
-- CREATE DATABASE cannot run inside the role-creation transaction. If this fails, stop and inspect;
-- never drop or reset pre-existing roles/databases automatically to make a retry pass.
CREATE DATABASE yashiluyim OWNER yashiluyim_migrator TEMPLATE template0 ENCODING 'UTF8';
REVOKE ALL ON DATABASE yashiluyim FROM PUBLIC;
GRANT CONNECT ON DATABASE yashiluyim TO yashiluyim_app;
ALTER ROLE yashiluyim_app IN DATABASE yashiluyim SET search_path=public;
ALTER ROLE yashiluyim_app IN DATABASE yashiluyim SET statement_timeout='15s';
\connect yashiluyim
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO yashiluyim_app;
