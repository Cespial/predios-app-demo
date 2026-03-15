ALTER TABLE predios ENABLE ROW LEVEL SECURITY;
ALTER TABLE generadores_demanda ENABLE ROW LEVEL SECURITY;
ALTER TABLE parqueaderos_existentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas_tecnicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lectura publica predios" ON predios FOR SELECT USING (true);
CREATE POLICY "lectura publica generadores" ON generadores_demanda FOR SELECT USING (true);
CREATE POLICY "lectura publica parqueaderos" ON parqueaderos_existentes FOR SELECT USING (true);
CREATE POLICY "lectura publica fichas" ON fichas_tecnicas FOR SELECT USING (true);
