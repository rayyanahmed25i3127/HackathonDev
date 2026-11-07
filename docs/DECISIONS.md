# Clinic ERP decisions

- The application is single-tenant: one clinic and one location. Workspace switching and workspace identifiers will be removed from user-facing workflows.
- Staff roles are `admin`, `doctor`, and `receptionist`; role authorization comes from Supabase profiles, never browser state.
- All persisted timestamps remain UTC. Display and day boundaries use `Asia/Karachi`.
- Money is integer paisa and is manually recorded on visits only. No payment provider or online checkout remains in the clinic product.
- WhatsApp supports a `mock` provider for local/e2e testing and a server-only Meta Cloud provider. Unconfigured sends must report an honest configuration error.
- The first implementation pass prioritizes the receptionist queue and patient registration because they are the clinic's primary workflow.
