CREATE TABLE public.gestor_vinculos (
  email_gestor text PRIMARY KEY,
  email_dono text NOT NULL,
  nome text,
  funcao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gestor_vinculos TO authenticated;
GRANT ALL ON public.gestor_vinculos TO service_role;
ALTER TABLE public.gestor_vinculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dono e gestor leem vinculo" ON public.gestor_vinculos FOR SELECT TO authenticated
USING (email_dono = lower(auth.jwt()->>'email') OR email_gestor = lower(auth.jwt()->>'email'));
CREATE INDEX gestor_vinculos_dono_idx ON public.gestor_vinculos(email_dono);

CREATE OR REPLACE FUNCTION public.conta_gestor() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.email_dono FROM public.gestor_vinculos v
  JOIN auth.users u ON lower(u.email) = v.email_gestor
  WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
  LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.conta_gestor() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.conta_gestor() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sincronizar_gestor_vinculos() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dono text := lower(NEW.conta);
BEGIN
  IF NEW.chave <> 'gerenciadores' THEN RETURN NEW; END IF;
  IF dono <> lower(coalesce(auth.jwt()->>'email','')) AND auth.role() <> 'service_role' THEN RETURN NEW; END IF;
  DELETE FROM public.gestor_vinculos WHERE email_dono = dono;
  INSERT INTO public.gestor_vinculos(email_gestor, email_dono, nome, funcao)
  SELECT DISTINCT ON (e) e, dono, g->>'nome', g->>'funcao'
  FROM (SELECT g, lower(trim(g->>'email')) e, ord FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(NEW.valor)='array' THEN NEW.valor ELSE '[]'::jsonb END) WITH ORDINALITY t(g, ord)) x
  WHERE e LIKE '%@%' AND e <> dono AND coalesce((g->>'is_hidden')::boolean,false) = false
    AND ord <= 50
  ORDER BY e
  LIMIT 4
  ON CONFLICT (email_gestor) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER dados_sync_gestores AFTER INSERT OR UPDATE ON public.dados
FOR EACH ROW EXECUTE FUNCTION public.sincronizar_gestor_vinculos();

DO $$
DECLARE t text; col text;
BEGIN
  FOREACH t IN ARRAY ARRAY['dados','empregador','escala','feriados','logs','pontos','funcionarios'] LOOP
    col := CASE WHEN t IN ('dados','feriados') THEN 'conta' ELSE 'email_dono' END;
    EXECUTE format('DROP POLICY IF EXISTS isolamento_conta ON public.%I', t);
    EXECUTE format('CREATE POLICY isolamento_conta ON public.%I FOR ALL TO authenticated USING (lower(%I) = ANY (ARRAY[lower((SELECT auth.jwt()->>''email'')), (SELECT public.suporte_conta()), (SELECT public.conta_gestor())])) WITH CHECK (lower(%I) = ANY (ARRAY[lower((SELECT auth.jwt()->>''email'')), (SELECT public.suporte_conta()), (SELECT public.conta_gestor())]))', t, col, col);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Conta le a propria licenca" ON public.licencas;
CREATE POLICY "Conta le a propria licenca" ON public.licencas FOR SELECT TO authenticated
USING (email_dono = lower((SELECT auth.jwt()->>'email')) OR email_dono = (SELECT public.conta_gestor()));

-- popula a partir das listas existentes
INSERT INTO public.gestor_vinculos(email_gestor, email_dono, nome, funcao)
SELECT DISTINCT ON (lower(trim(g->>'email'))) lower(trim(g->>'email')), lower(d.conta), g->>'nome', g->>'funcao'
FROM public.dados d, jsonb_array_elements(CASE WHEN jsonb_typeof(d.valor)='array' THEN d.valor ELSE '[]'::jsonb END) g
WHERE d.chave='gerenciadores' AND g->>'email' LIKE '%@%' AND lower(trim(g->>'email')) <> lower(d.conta)
  AND coalesce((g->>'is_hidden')::boolean,false)=false
ON CONFLICT DO NOTHING;