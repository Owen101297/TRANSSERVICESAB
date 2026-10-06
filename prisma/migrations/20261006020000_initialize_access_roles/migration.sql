-- Solo inicializa el nuevo campo; perfiles y credenciales permanecen intactos.
UPDATE "Persona" SET "rolAcceso" = CASE
 WHEN "perfiles" && ARRAY['administrativo','admin','hseq','supervisor','coordinador','operaciones','gerente','logistica']::TEXT[] THEN 'administrativo'
 ELSE 'conductor'
END WHERE "rolAcceso" IS NULL;
