CREATE OR REPLACE FUNCTION "private"."expose_schemas"() RETURNS "pg_catalog"."text" AS $BODY$
  DECLARE schemas text;
  BEGIN
  -- get all tenant schemas in addition to "public" and "storage"
  SELECT 'public,storage,private' || COALESCE(',' || string_agg(nspname, ','), '') INTO schemas
  FROM pg_namespace
  WHERE nspname LIKE 'org_%';
  -- expose schemas
  EXECUTE 'ALTER ROLE authenticator SET pgrst.db_schemas = ' || quote_literal(schemas);
  -- notify postgrest for the schema config
  NOTIFY pgrst, 'reload config';
  NOTIFY pgrst, 'reload schema';

  RETURN schemas;
END
$BODY$
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

SELECT private.expose_schemas();
