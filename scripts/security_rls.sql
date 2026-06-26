ALTER TABLE festivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS festivals_select ON festivals;
CREATE POLICY festivals_select ON festivals FOR SELECT USING (true);
DROP POLICY IF EXISTS municipalities_select ON municipalities;
CREATE POLICY municipalities_select ON municipalities FOR SELECT USING (true);
DROP POLICY IF EXISTS municipalities_update_own ON municipalities;
CREATE POLICY municipalities_update_own ON municipalities FOR UPDATE
  USING (token_edicion = current_setting('app.current_token', true))
  WITH CHECK (token_edicion = current_setting('app.current_token', true));
