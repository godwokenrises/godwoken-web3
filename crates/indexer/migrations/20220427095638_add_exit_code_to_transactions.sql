-- Add migration script here
-- exit_code: u8
ALTER TABLE transactions ADD COLUMN exit_code smallint NOT NULL;
ALTER TABLE transactions DROP COLUMN status;
