# Clinic ERP decisions

- The application is single-tenant: one clinic and one location. Workspace switching and workspace identifiers will be removed from user-facing workflows.
- Staff roles are `admin`, `doctor`, and `receptionist`; role authorization comes from Supabase profiles, never browser state.
- All persisted timestamps remain UTC. Display and day boundaries use `Asia/Karachi`.
- Money is integer paisa and is manually recorded on visits only. No payment provider or online checkout remains in the clinic product.
- WhatsApp supports a `mock` provider for local/e2e testing and a server-only Meta Cloud provider. Unconfigured sends must report an honest configuration error.
- The first implementation pass prioritizes the receptionist queue and patient registration because they are the clinic's primary workflow.
- The clinic is RASS at 3rd floor, Plaza 95, Bunyad Plaza, Paradise Commercial Way, Phase 4 Bahria Town, Islamabad. The current phone (`03199789989`) and 09:00–17:00 operating hours are provisional and must remain editable in clinic settings.
- The doctors are Lt. Col. Dr. Majid Hussain (R), dermatologist, and Lt. Col. Dr. Maeirah Shafique (R), ophthalmologist. Doctors can edit clinical notes and prescriptions for their own visits; the admin can access all clinical records; receptionists cannot access clinical content.
- Website submissions are inquiries, not appointments. The website sends the submission to the receptionist by Resend email. The receptionist contacts the person and manually registers/ books the patient after confirmation. No patient or appointment is auto-created from the public form.
- WhatsApp notifications for website inquiries are optional follow-up work; the receptionist email workflow is the initial source of truth.
