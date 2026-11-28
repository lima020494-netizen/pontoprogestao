REVOKE EXECUTE ON FUNCTION public.sincronizar_gestor_vinculos() FROM public, anon, authenticated;
DROP POLICY "Dono e gestor leem vinculo" ON public.gestor_vinculos;
CREATE POLICY "Dono e gestor leem vinculo" ON public.gestor_vinculos FOR SELECT TO authenticated
USING (email_dono = lower((SELECT auth.jwt()->>'email')) OR email_gestor = lower((SELECT auth.jwt()->>'email')));