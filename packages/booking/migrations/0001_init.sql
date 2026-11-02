-- Redpoint Booking v1 — initial schema.
-- Explicit SQL is the source of truth for constraints (spec §3, §9).
-- Drizzle schema in src/db/schema.ts mirrors these tables for typed queries.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------- catalogue

CREATE TABLE location (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  address     text NOT NULL,
  timezone    text NOT NULL DEFAULT 'Europe/Prague',
  phone       text,
  email       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clinic_settings (
  id               smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- Default is request-only until existing appointments are reconciled (spec §2, §14).
  public_mode      text NOT NULL DEFAULT 'request_only' CHECK (public_mode IN ('automatic', 'request_only', 'paused')),
  paused_message   text,
  reception_phone  text,
  reception_email  text,
  version          integer NOT NULL DEFAULT 1,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE booking_policy (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version                    integer NOT NULL UNIQUE CHECK (version > 0),
  -- Elapsed hours before start. Working-day semantics still to be confirmed (spec §7).
  cancellation_cutoff_hours  integer NOT NULL CHECK (cancellation_cutoff_hours >= 0),
  terms_text                 text NOT NULL,
  active                     boolean NOT NULL DEFAULT false,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX booking_policy_one_active ON booking_policy ((true)) WHERE active;

CREATE TABLE therapist (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  display_name  text NOT NULL,
  bio           text,
  location_id   uuid NOT NULL REFERENCES location(id),
  active        boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Every schedulable thing is a resource; therapists have exactly one resource each.
-- Rooms/equipment (e.g. Redcord) can be added as additional resources if confirmed scarce.
CREATE TABLE resource (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          text NOT NULL CHECK (kind IN ('therapist', 'room', 'equipment')),
  name          text NOT NULL,
  therapist_id  uuid UNIQUE REFERENCES therapist(id),
  location_id   uuid NOT NULL REFERENCES location(id),
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'therapist') = (therapist_id IS NOT NULL))
);

CREATE TABLE service (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 text NOT NULL UNIQUE,
  name                 text NOT NULL,
  description          text,
  first_visit_info     text,
  location_id          uuid NOT NULL REFERENCES location(id),
  active               boolean NOT NULL DEFAULT true,
  duration_min         integer NOT NULL CHECK (duration_min > 0 AND duration_min <= 480),
  buffer_before_min    integer NOT NULL DEFAULT 0 CHECK (buffer_before_min >= 0 AND buffer_before_min <= 120),
  buffer_after_min     integer NOT NULL DEFAULT 0 CHECK (buffer_after_min >= 0 AND buffer_after_min <= 120),
  -- Money in integer minor units (haléře). price_max NULL = fixed price.
  price_min_minor      integer CHECK (price_min_minor >= 0),
  price_max_minor      integer CHECK (price_max_minor >= 0),
  currency             text NOT NULL DEFAULT 'CZK' CHECK (currency = 'CZK'),
  booking_mode         text NOT NULL DEFAULT 'automatic' CHECK (booking_mode IN ('automatic', 'request_only')),
  new_patients         text NOT NULL DEFAULT 'allowed' CHECK (new_patients IN ('allowed', 'not_allowed', 'only')),
  -- Clinically restricted eligibility → always reception review (spec §5).
  requires_review      boolean NOT NULL DEFAULT false,
  min_lead_minutes     integer NOT NULL DEFAULT 720 CHECK (min_lead_minutes >= 0),
  horizon_days         integer NOT NULL DEFAULT 60 CHECK (horizon_days > 0 AND horizon_days <= 365),
  slot_step_min        integer NOT NULL DEFAULT 15 CHECK (slot_step_min IN (5, 10, 15, 20, 30, 60)),
  sort_order           integer NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CHECK (price_max_minor IS NULL OR price_min_minor IS NULL OR price_max_minor >= price_min_minor)
);

CREATE TABLE service_required_resource (
  service_id   uuid NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  resource_id  uuid NOT NULL REFERENCES resource(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (service_id, resource_id)
);

CREATE TABLE therapist_service (
  therapist_id           uuid NOT NULL REFERENCES therapist(id) ON DELETE CASCADE,
  service_id             uuid NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  active                 boolean NOT NULL DEFAULT true,
  -- Explicit overrides only; NULL means "use service default".
  duration_min_override  integer CHECK (duration_min_override > 0 AND duration_min_override <= 480),
  price_min_override     integer CHECK (price_min_override >= 0),
  price_max_override     integer CHECK (price_max_override >= 0),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (therapist_id, service_id)
);

-- ---------------------------------------------------------------- staff

CREATE TABLE staff_profile (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject  text UNIQUE,
  email         text NOT NULL UNIQUE,
  display_name  text NOT NULL,
  role          text NOT NULL CHECK (role IN ('therapist', 'reception', 'admin')),
  therapist_id  uuid REFERENCES therapist(id),
  active        boolean NOT NULL DEFAULT true,
  version       integer NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (role <> 'therapist' OR therapist_id IS NOT NULL),
  CHECK (email = lower(email))
);

-- ---------------------------------------------------------------- schedule (local Europe/Prague rules)

CREATE TABLE working_hours (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id  uuid NOT NULL REFERENCES therapist(id) ON DELETE CASCADE,
  weekday       smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7), -- ISO: 1 = Monday
  start_local   time NOT NULL,
  end_local     time NOT NULL,
  valid_from    date,
  valid_to      date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (end_local > start_local),
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);
CREATE INDEX working_hours_therapist ON working_hours (therapist_id, weekday);

-- Dated overrides. therapist_id NULL = whole-clinic closure/override.
-- 'closed' = no availability that day (leave, holiday); 'custom_hours' replaces weekly hours that day.
-- Partial-day breaks and leave are manual time blocks (occupancy).
CREATE TABLE schedule_exception (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id  uuid REFERENCES therapist(id) ON DELETE CASCADE,
  date          date NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('closed', 'custom_hours')),
  start_local   time,
  end_local     time,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'closed' AND start_local IS NULL AND end_local IS NULL)
      OR (kind = 'custom_hours' AND start_local IS NOT NULL AND end_local IS NOT NULL AND end_local > start_local))
);
CREATE INDEX schedule_exception_date ON schedule_exception (date, therapist_id);

-- ---------------------------------------------------------------- patients, requests, appointments

CREATE TABLE patient_contact (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  email           text NOT NULL CHECK (email = lower(email)),
  email_verified  boolean NOT NULL DEFAULT false,
  phone           text NOT NULL,
  is_new_patient  boolean NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX patient_contact_email ON patient_contact (email);

CREATE TABLE appointment_request (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference                text NOT NULL UNIQUE,
  patient_contact_id       uuid NOT NULL REFERENCES patient_contact(id),
  service_id               uuid NOT NULL REFERENCES service(id),
  therapist_id             uuid REFERENCES therapist(id),
  preferred_from           date NOT NULL,
  preferred_to             date NOT NULL,
  preferred_time_of_day    text NOT NULL DEFAULT 'any' CHECK (preferred_time_of_day IN ('any', 'morning', 'afternoon')),
  preferred_start          timestamptz,
  state                    text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'resolved', 'declined')),
  resolved_appointment_id  uuid,
  decline_message          text,
  version                  integer NOT NULL DEFAULT 1,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CHECK (preferred_to >= preferred_from AND preferred_to - preferred_from <= 62)
);
CREATE INDEX appointment_request_state ON appointment_request (state, created_at);

CREATE TABLE appointment (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference                  text NOT NULL UNIQUE,
  patient_contact_id         uuid NOT NULL REFERENCES patient_contact(id),
  service_id                 uuid NOT NULL REFERENCES service(id),
  therapist_id               uuid NOT NULL REFERENCES therapist(id),
  location_id                uuid NOT NULL REFERENCES location(id),
  starts_at                  timestamptz NOT NULL,
  ends_at                    timestamptz NOT NULL,
  -- Snapshots at booking time (spec §8): catalogue edits never rewrite commitments.
  service_name               text NOT NULL,
  duration_min               integer NOT NULL,
  buffer_before_min          integer NOT NULL,
  buffer_after_min           integer NOT NULL,
  price_min_minor            integer,
  price_max_minor            integer,
  currency                   text NOT NULL DEFAULT 'CZK',
  policy_version             integer NOT NULL,
  cancellation_cutoff_hours  integer NOT NULL,
  state                      text NOT NULL DEFAULT 'confirmed' CHECK (state IN ('confirmed', 'completed', 'no_show', 'cancelled')),
  version                    integer NOT NULL DEFAULT 1,
  source                     text NOT NULL CHECK (source IN ('online', 'reception', 'request', 'import')),
  request_id                 uuid REFERENCES appointment_request(id),
  cancelled_at               timestamptz,
  cancelled_by               text CHECK (cancelled_by IN ('patient', 'staff')),
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX appointment_therapist_time ON appointment (therapist_id, starts_at);
CREATE INDEX appointment_time ON appointment (starts_at);

ALTER TABLE appointment_request
  ADD CONSTRAINT appointment_request_resolved_fk FOREIGN KEY (resolved_appointment_id) REFERENCES appointment(id);

CREATE TABLE time_block (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id  uuid NOT NULL REFERENCES resource(id),
  starts_at    timestamptz NOT NULL,
  ends_at      timestamptz NOT NULL,
  kind         text NOT NULL DEFAULT 'block' CHECK (kind IN ('block', 'break', 'leave')),
  note         text,
  created_by   uuid REFERENCES staff_profile(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

-- The single constraint domain for therapist/room time: appointment occupancy (buffered)
-- and manual blocks. Half-open [start, end) so adjacent intervals never collide.
CREATE TABLE occupancy (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id     uuid NOT NULL REFERENCES resource(id),
  during          tstzrange NOT NULL,
  appointment_id  uuid REFERENCES appointment(id) ON DELETE CASCADE,
  time_block_id   uuid REFERENCES time_block(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK ((appointment_id IS NULL) <> (time_block_id IS NULL)),
  CHECK (NOT isempty(during) AND lower_inc(during) AND NOT upper_inc(during)
         AND NOT lower_inf(during) AND NOT upper_inf(during)),
  CONSTRAINT occupancy_no_overlap EXCLUDE USING gist (resource_id WITH =, during WITH &&)
);
CREATE INDEX occupancy_appointment ON occupancy (appointment_id);
CREATE INDEX occupancy_block ON occupancy (time_block_id);

-- ---------------------------------------------------------------- idempotency, verification, sessions

CREATE TABLE idempotency_record (
  scope        text NOT NULL,
  key          text NOT NULL,
  fingerprint  text NOT NULL,
  response     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, key)
);

CREATE TABLE guest_session (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash      text NOT NULL UNIQUE,
  purpose         text NOT NULL CHECK (purpose IN ('booking', 'manage')),
  email           text,
  appointment_id  uuid REFERENCES appointment(id),
  verified        boolean NOT NULL DEFAULT false,
  bookings_made   integer NOT NULL DEFAULT 0,
  expires_at      timestamptz NOT NULL,
  revoked_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (purpose <> 'booking' OR email IS NOT NULL),
  CHECK (purpose <> 'manage' OR appointment_id IS NOT NULL)
);

CREATE TABLE verification_challenge (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose           text NOT NULL CHECK (purpose IN ('booking', 'manage')),
  email             text NOT NULL,
  guest_session_id  uuid REFERENCES guest_session(id),
  code_hash         text NOT NULL,
  attempts          integer NOT NULL DEFAULT 0,
  max_attempts      integer NOT NULL DEFAULT 5,
  expires_at        timestamptz NOT NULL,
  consumed_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE management_credential (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash      text NOT NULL UNIQUE,
  appointment_id  uuid NOT NULL REFERENCES appointment(id),
  expires_at      timestamptz NOT NULL,
  revoked_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rate_limit (
  bucket        text NOT NULL,
  window_start  timestamptz NOT NULL,
  count         integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

-- ---------------------------------------------------------------- notifications & audit

CREATE TABLE notification_outbox (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event                text NOT NULL CHECK (event IN (
                          'appointment_confirmed', 'appointment_rescheduled', 'appointment_cancelled',
                          'appointment_reminder', 'request_received', 'request_declined')),
  channel              text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms')),
  appointment_id       uuid REFERENCES appointment(id),
  appointment_version  integer,
  request_id           uuid REFERENCES appointment_request(id),
  -- event/version/channel(/target) dedupe (spec §11)
  dedupe_key           text NOT NULL UNIQUE,
  status               text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts             integer NOT NULL DEFAULT 0,
  max_attempts         integer NOT NULL DEFAULT 8,
  next_attempt_at      timestamptz NOT NULL DEFAULT now(),
  locked_until         timestamptz,
  last_error           text,
  sent_at              timestamptz,
  provider_message_id  text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CHECK (appointment_id IS NOT NULL OR request_id IS NOT NULL)
);
CREATE INDEX notification_outbox_due ON notification_outbox (status, next_attempt_at);

CREATE TABLE audit_event (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type   text NOT NULL CHECK (actor_type IN ('staff', 'patient', 'system')),
  actor_id     text,
  operation    text NOT NULL,
  record_type  text NOT NULL,
  record_id    uuid,
  -- Non-personal details only (ids, versions, times, states).
  details      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_event_record ON audit_event (record_type, record_id);
CREATE INDEX audit_event_time ON audit_event (created_at DESC);

-- Development/test email capture (EMAIL_PROVIDER=capture). Never used in production.
CREATE TABLE captured_email (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_address  text NOT NULL,
  subject     text NOT NULL,
  text_body   text NOT NULL,
  html_body   text,
  has_ics     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- updated_at triggers
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'location','clinic_settings','booking_policy','therapist','resource','service','service_required_resource',
    'therapist_service','staff_profile','working_hours','schedule_exception','patient_contact','appointment_request',
    'appointment','time_block','occupancy','idempotency_record','guest_session','verification_challenge',
    'management_credential','notification_outbox'
  ] LOOP
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

-- Supabase Data API hardening (spec §12): if these tables are exposed via PostgREST,
-- deny by default. Server code connects with a privileged role and enforces roles itself.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = current_schema() LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA ' || quote_ident(current_schema()) || ' FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA ' || quote_ident(current_schema()) || ' FROM authenticated';
  END IF;
END $$;
