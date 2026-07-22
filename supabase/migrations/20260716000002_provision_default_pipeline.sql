-- The CRM module showed "Nenhum pipeline configurado para este workspace" because
-- crm.ensure_default_pipeline() was defined (20260623000002_crm_flow.sql) but never
-- invoked anywhere: not on workspace creation, not from the frontend. As a result
-- crm.pipelines was empty, CRM.jsx's load() found no default pipeline, and the
-- "+ Negócio" button (which only opens the modal when a pipeline exists) appeared
-- to do nothing.

-- 1) Backfill: provision the default pipeline for every existing workspace.
DO $$
DECLARE
  ws record;
BEGIN
  FOR ws IN SELECT id FROM public.workspaces LOOP
    PERFORM crm.ensure_default_pipeline(ws.id);
  END LOOP;
END $$;

-- 2) Going forward: auto-provision a default pipeline whenever a workspace is created.
CREATE OR REPLACE FUNCTION public.provision_workspace_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = crm, public AS $$
BEGIN
  PERFORM crm.ensure_default_pipeline(NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_provision_workspace_defaults ON public.workspaces;
CREATE TRIGGER trg_provision_workspace_defaults
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.provision_workspace_defaults();
