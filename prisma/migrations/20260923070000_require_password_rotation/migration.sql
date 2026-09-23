-- Additive security migration: existing users keep access and are evaluated at login.
ALTER TABLE "Persona"
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
