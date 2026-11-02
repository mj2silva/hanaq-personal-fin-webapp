SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict PoL9FqlmZT4XvJsV2OsmA7H5DuapGoWXBsdBxp1pXya4SOifvi7UYeyn1OzyJ6n

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") VALUES
	('00000000-0000-0000-0000-000000000000', '76170dd4-e0ae-4feb-944f-d392d49409d2', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"manuel.silvag1@gmail.com","user_id":"06e48eee-ef1b-4897-a9e8-85283a35ea0f","user_phone":""}}', '2026-10-29 04:06:33.152584+00', ''),
	('00000000-0000-0000-0000-000000000000', '5722c940-f544-4707-be46-8deac0987ae4', '{"action":"login","actor_id":"06e48eee-ef1b-4897-a9e8-85283a35ea0f","actor_username":"manuel.silvag1@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-10-29 04:45:17.447332+00', ''),
	('00000000-0000-0000-0000-000000000000', 'dde69bfb-9dcf-4785-b0cb-b5b25756639c', '{"action":"token_refreshed","actor_id":"06e48eee-ef1b-4897-a9e8-85283a35ea0f","actor_username":"manuel.silvag1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-10-29 15:20:16.368778+00', ''),
	('00000000-0000-0000-0000-000000000000', 'dee58e4e-d391-4a7a-89b9-2a5b301feae5', '{"action":"token_revoked","actor_id":"06e48eee-ef1b-4897-a9e8-85283a35ea0f","actor_username":"manuel.silvag1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-10-29 15:20:16.385397+00', ''),
	('00000000-0000-0000-0000-000000000000', 'effedd7d-a175-4f06-9365-a39624ad3cea', '{"action":"token_refreshed","actor_id":"06e48eee-ef1b-4897-a9e8-85283a35ea0f","actor_username":"manuel.silvag1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-10-29 16:52:49.166722+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ce9faa05-aa84-49cc-9404-8c28209fd49a', '{"action":"token_revoked","actor_id":"06e48eee-ef1b-4897-a9e8-85283a35ea0f","actor_username":"manuel.silvag1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-10-29 16:52:49.178285+00', ''),
	('00000000-0000-0000-0000-000000000000', '8e431231-207a-4dd0-987d-e5db64495eb7', '{"action":"token_refreshed","actor_id":"06e48eee-ef1b-4897-a9e8-85283a35ea0f","actor_username":"manuel.silvag1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-10-29 19:10:12.311954+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c1b4545f-9c33-4050-9442-c2ace06fe23b', '{"action":"token_revoked","actor_id":"06e48eee-ef1b-4897-a9e8-85283a35ea0f","actor_username":"manuel.silvag1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-10-29 19:10:12.35691+00', ''),
	('00000000-0000-0000-0000-000000000000', '54f9559e-5d92-4274-a45e-3480cca31020', '{"action":"token_refreshed","actor_id":"06e48eee-ef1b-4897-a9e8-85283a35ea0f","actor_username":"manuel.silvag1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-10-29 19:10:13.437502+00', ''),
	('00000000-0000-0000-0000-000000000000', '78765d22-3723-4def-8643-5edf1994de76', '{"action":"token_refreshed","actor_id":"06e48eee-ef1b-4897-a9e8-85283a35ea0f","actor_username":"manuel.silvag1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-10-29 19:10:13.736251+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b84e08f0-adaf-4419-b1da-b97a85df49cc', '{"action":"token_refreshed","actor_id":"06e48eee-ef1b-4897-a9e8-85283a35ea0f","actor_username":"manuel.silvag1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-10-29 20:09:41.609096+00', ''),
	('00000000-0000-0000-0000-000000000000', '80a0f6ea-5c66-4d18-8cd6-f2a7ab5de526', '{"action":"token_revoked","actor_id":"06e48eee-ef1b-4897-a9e8-85283a35ea0f","actor_username":"manuel.silvag1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-10-29 20:09:41.621098+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c0c5fe9e-d797-4ddd-93b0-eabb9d1c2ae4', '{"action":"token_refreshed","actor_id":"06e48eee-ef1b-4897-a9e8-85283a35ea0f","actor_username":"manuel.silvag1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-10-29 21:08:37.965732+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd9a64b89-2d1f-4b3a-b2c0-85b3cde1ef78', '{"action":"token_revoked","actor_id":"06e48eee-ef1b-4897-a9e8-85283a35ea0f","actor_username":"manuel.silvag1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-10-29 21:08:37.980366+00', ''),
	('00000000-0000-0000-0000-000000000000', '6e5dbcb7-d22b-45c8-b8de-5dfe336cfc09', '{"action":"token_refreshed","actor_id":"06e48eee-ef1b-4897-a9e8-85283a35ea0f","actor_username":"manuel.silvag1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-10-29 22:10:06.049275+00', ''),
	('00000000-0000-0000-0000-000000000000', 'da09f1b7-7f97-4293-a1d2-3ddfd8f286c5', '{"action":"token_revoked","actor_id":"06e48eee-ef1b-4897-a9e8-85283a35ea0f","actor_username":"manuel.silvag1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-10-29 22:10:06.062349+00', ''),
	('00000000-0000-0000-0000-000000000000', '66d55747-73ea-441f-b7db-f206eca01448', '{"action":"token_refreshed","actor_id":"06e48eee-ef1b-4897-a9e8-85283a35ea0f","actor_username":"manuel.silvag1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-10-30 02:09:29.664705+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f32bb23e-8dba-4431-8a19-667a3fbd5af7', '{"action":"token_revoked","actor_id":"06e48eee-ef1b-4897-a9e8-85283a35ea0f","actor_username":"manuel.silvag1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-10-30 02:09:29.691311+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bac89600-991a-4b4e-b53a-07273b6a58d2', '{"action":"logout","actor_id":"06e48eee-ef1b-4897-a9e8-85283a35ea0f","actor_username":"manuel.silvag1@gmail.com","actor_via_sso":false,"log_type":"account"}', '2026-10-30 02:12:43.547325+00', '');


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'authenticated', 'authenticated', 'manuel.silvag1@gmail.com', '$2a$10$g6cnBNWFbUUKHSrqYI95quBaK/bl8DMUpixVhjOvYUK2hgEy5U2ue', '2026-10-29 04:06:33.168951+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-10-29 04:45:17.456173+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-10-29 04:06:33.105585+00', '2026-10-30 02:09:29.724246+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('06e48eee-ef1b-4897-a9e8-85283a35ea0f', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', '{"sub": "06e48eee-ef1b-4897-a9e8-85283a35ea0f", "email": "manuel.silvag1@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-10-29 04:06:33.140148+00', '2026-10-29 04:06:33.140347+00', '2026-10-29 04:06:33.140347+00', '77ab2d01-fd02-41e6-91b6-f7b0112536c5');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_recovery_code_sets; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_recovery_codes; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: scim_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: scim_users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."accounts" ("id", "user_id", "name", "type", "bank_name", "currency", "initial_balance", "current_balance", "trea_percentage", "is_active", "created_at") VALUES
	('919394e6-ea06-4ca8-ac11-8c814e9aad3e', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'CTS', 'BANK_ACCOUNT', 'Scotiabank', 'PEN', 597.40, 597.40, 7.00, true, '2026-10-29 19:20:31.050159+00'),
	('13e4e3d9-a165-4f39-b03b-2bd4f3ca7e38', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Power', 'BANK_ACCOUNT', 'Scotiabank', 'PEN', 37189.93, 37189.93, 4.60, true, '2026-10-29 19:21:32.105315+00'),
	('1b00082b-5dc7-4fc8-8b42-74af57e0907f', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Efectivo', 'CASH_BOX', NULL, 'PEN', 0.00, 0.00, 0.00, true, '2026-10-29 19:21:51.354711+00'),
	('3de0983a-cb84-490b-a46a-2fad471fab80', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'BCP Ahorro', 'BANK_ACCOUNT', 'BCP', 'PEN', 485.55, 485.55, 0.00, true, '2026-10-29 20:04:04.209929+00'),
	('a474d53d-21ac-4f89-a2d8-585825b905d7', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Scotia sueldo', 'BANK_ACCOUNT', 'Scotiabank', 'PEN', 2958.22, 1358.22, 0.00, true, '2026-10-29 05:04:28.1773+00'),
	('f8331450-f3b7-46fb-9685-95ee3b54ca10', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Ahorros BN', 'BANK_ACCOUNT', 'Banco de la nación', 'PEN', 130.67, 130.67, 0.01, true, '2026-10-29 20:49:56.991846+00'),
	('28d4a9e5-fa71-41d1-9c41-1cd2543d32a1', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Pluxee', 'BANK_ACCOUNT', 'Pluxee', 'PEN', 25.29, 225.29, 0.00, true, '2026-10-30 02:10:30.968803+00');


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."categories" ("id", "user_id", "name", "type", "is_active", "created_at") VALUES
	('dbcabafe-f34d-42b3-940c-c87c9d1ba6be', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Alimentación', 'EXPENSE', true, '2026-10-29 05:04:05.906793+00'),
	('10d78fd9-6b6c-47ea-ba79-bf80ebe24ddb', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Transporte', 'EXPENSE', true, '2026-10-29 05:04:41.466441+00'),
	('4dbe4be1-8ca9-4d62-903c-72d3b5543ae9', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Mascotas', 'EXPENSE', true, '2026-10-29 05:05:03.231537+00'),
	('4b2a1203-4191-4205-9aa1-5bcbffe56f68', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Sueldo', 'INCOME', true, '2026-10-29 05:04:49.285669+00'),
	('0d740f00-6655-45fb-9f74-bf82ab692817', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Vivienda', 'EXPENSE', true, '2026-10-29 19:17:58.726235+00'),
	('3266ce7e-b853-4e5e-b439-46e084cc6c9d', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Servicios', 'EXPENSE', true, '2026-10-29 19:18:08.161902+00'),
	('b2f81a68-29de-4457-89b6-dbf57e8dc5fb', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Educación', 'EXPENSE', true, '2026-10-29 20:10:06.418627+00'),
	('b309a138-ca5f-4566-a966-e92021f8a98e', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Depósitos', 'INCOME', true, '2026-10-29 20:10:48.765887+00'),
	('1593a528-f7cc-421d-92de-3f6cf495df0f', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Suscripciones', 'EXPENSE', true, '2026-10-29 20:18:10.157099+00'),
	('01f59664-04c1-42df-a99f-8f41c79bffee', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Familia', 'EXPENSE', true, '2026-10-29 20:43:40.587045+00'),
	('d7c9641a-64af-45df-8aa2-43b73b0037e5', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Ocio / Salidas', 'EXPENSE', true, '2026-10-29 21:38:27.588328+00'),
	('ab2e23b9-0c5f-44d7-9b1e-cda8760cd842', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'CTS', 'INCOME', true, '2026-10-29 21:38:33.814502+00'),
	('7fd70096-b13c-4ce0-8dec-eeb7e88a606d', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Gratificación', 'INCOME', true, '2026-10-29 21:38:41.128837+00'),
	('83533159-7e5e-4cc3-a4b1-7026fe9a9d98', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Viajes', 'EXPENSE', true, '2026-10-29 22:11:51.909992+00');


--
-- Data for Name: budgets; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."budgets" ("id", "user_id", "category_id", "period_year_month", "limit_amount_pen", "created_at") VALUES
	('e2c3138a-c227-40e3-b7c6-aa06c651b9af', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'dbcabafe-f34d-42b3-940c-c87c9d1ba6be', '2026-10', 400.00, '2026-10-29 19:16:22.463115+00'),
	('8f0e4f97-36b0-43a8-a113-219e3f87e2c1', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', '4dbe4be1-8ca9-4d62-903c-72d3b5543ae9', '2026-10', 50.00, '2026-10-29 19:16:47.749566+00'),
	('606d7ac3-ecde-444d-ae0e-8a117efe461d', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', '10d78fd9-6b6c-47ea-ba79-bf80ebe24ddb', '2026-10', 80.00, '2026-10-29 19:17:00.000351+00'),
	('e4a7d6fb-a1de-465b-9d40-50ded70323ce', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', '0d740f00-6655-45fb-9f74-bf82ab692817', '2026-10', 1600.00, '2026-10-29 20:16:51.03229+00'),
	('642beb80-1031-41cf-9a7b-d1d6481ded14', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', '1593a528-f7cc-421d-92de-3f6cf495df0f', '2026-10', 100.00, '2026-10-29 20:21:39.810677+00'),
	('e60c9467-6083-4bb5-b3c0-d39aafdad27a', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'b2f81a68-29de-4457-89b6-dbf57e8dc5fb', '2026-10', 1270.00, '2026-10-29 20:21:58.150903+00'),
	('1b05f253-385e-4767-ab70-29ff63d86198', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', '3266ce7e-b853-4e5e-b439-46e084cc6c9d', '2026-10', 350.00, '2026-10-29 20:22:50.898788+00'),
	('0e4a51da-0af5-4e8d-9caa-aa473a1aff2c', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', '01f59664-04c1-42df-a99f-8f41c79bffee', '2026-10', 200.00, '2026-10-29 20:44:13.880924+00'),
	('67637421-5338-40a2-b7be-041796f817d8', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'd7c9641a-64af-45df-8aa2-43b73b0037e5', '2026-10', 150.00, '2026-10-29 21:55:20.236584+00');


--
-- Data for Name: credit_cards; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."credit_cards" ("id", "user_id", "name", "bank_name", "is_bimonetary", "initial_debt_pen", "initial_debt_usd", "current_debt_pen", "current_debt_usd", "default_tea", "closing_day", "payment_due_day", "desgravamen_rate", "desgravamen_max_pen", "has_annual_fee", "annual_fee_amount", "annual_fee_currency", "annual_fee_month", "exemption_rule", "exemption_min_amount", "is_active", "created_at", "credit_limit_currency", "credit_limit_amount", "credit_limit_alert_percentage") VALUES
	('23311604-f3b2-4cc9-a66e-0a7e4b4d5706', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Scotia platinum', 'Scotiabank', true, 3817.33, 6.49, 3817.33, 6.49, 0.00, 4, 1, 0.0040, 7.00, false, NULL, 'PEN', NULL, 'MIN_MONTHLY_SPEND', 0.00, true, '2026-10-29 19:37:56.574273+00', 'USD', 1450.00, 70.00),
	('b8a8919d-e736-4441-9875-8875e01d4f04', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'BCP Latam pass', 'BCP', true, 142.95, 0.00, 142.95, 0.00, 0.00, 27, 20, 0.0034, 20.00, false, NULL, 'PEN', NULL, 'MIN_MONTHLY_SPEND', 50.00, true, '2026-10-29 19:41:40.428021+00', 'PEN', 800.00, 70.00),
	('d645e9b0-20c5-4094-a97c-15ee5ff05d14', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'CMR Platinum', 'Falabella', true, 1009.38, 0.00, 1009.38, 0.00, 0.00, 10, 5, 0.0329, 13.90, false, NULL, 'PEN', NULL, 'MIN_MONTHLY_SPEND', 250.00, true, '2026-10-29 19:45:43.007476+00', 'PEN', 10200.00, 70.00),
	('c33d56eb-8665-4925-9e1c-949d7867adc4', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'BBVA Signature', 'BBVA', true, 8003.00, 0.00, 8003.00, 0.00, 0.00, 10, 5, 0.0039, 20.00, false, NULL, 'PEN', NULL, 'MIN_ANNUAL_SPEND', 24000.00, true, '2026-10-29 20:46:49.86756+00', 'PEN', 21600.00, 70.00);


--
-- Data for Name: credit_card_statements; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: exchange_rates; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."exchange_rates" ("id", "user_id", "rate_date", "usd_to_pen_rate", "created_at") VALUES
	('41190a6b-3931-466b-ad15-7fbb198da87d', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', '2026-10-29', 3.4580, '2026-10-29 05:04:28.147675+00');


--
-- Data for Name: fixed_expenses_template; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."fixed_expenses_template" ("id", "user_id", "name", "category_id", "estimated_amount", "currency", "due_day", "is_active", "created_at") VALUES
	('e07784f9-2cc3-43ac-b3fb-4670964e42a3', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Internet', '3266ce7e-b853-4e5e-b439-46e084cc6c9d', 100.00, 'PEN', 28, true, '2026-10-29 20:11:46.470448+00'),
	('e868415a-f6cf-4238-88b9-1bf66f276f20', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Luz', '3266ce7e-b853-4e5e-b439-46e084cc6c9d', 100.00, 'PEN', 17, true, '2026-10-29 20:12:02.435142+00'),
	('5661da8a-51a4-4925-ab09-60ae2e16a35c', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Agua', '3266ce7e-b853-4e5e-b439-46e084cc6c9d', 50.00, 'PEN', 30, true, '2026-10-29 20:12:12.44919+00'),
	('a907d30d-f262-4db3-b167-1ee9a3dc684c', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Mantenimiento', '3266ce7e-b853-4e5e-b439-46e084cc6c9d', 40.00, 'PEN', 30, true, '2026-10-29 20:12:28.392173+00'),
	('1a819821-3cee-4f8b-b3df-e4bc78a0feaf', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Celular', '3266ce7e-b853-4e5e-b439-46e084cc6c9d', 48.00, 'PEN', 20, true, '2026-10-29 20:12:44.600731+00'),
	('ebd444cd-e1c3-4dfd-a8d4-b4afb427e8f4', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Préstamo maestría', 'b2f81a68-29de-4457-89b6-dbf57e8dc5fb', 1270.00, 'PEN', 17, true, '2026-10-29 20:11:32.496038+00'),
	('02368ada-2c2d-4168-a0f7-c66b0693c2f9', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Alquiler', '0d740f00-6655-45fb-9f74-bf82ab692817', 1600.00, 'PEN', 30, true, '2026-10-29 19:18:40.038296+00'),
	('286c0c59-8127-46b7-98aa-69847a537de2', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Pandero', '01f59664-04c1-42df-a99f-8f41c79bffee', 200.00, 'PEN', 30, true, '2026-10-29 20:43:09.748258+00');


--
-- Data for Name: investments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."investments" ("id", "user_id", "name", "currency", "initial_capital", "current_value", "is_active", "created_at") VALUES
	('e3fc50c4-2930-4293-bbbf-3f4811cf56c2', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'SF Corto plazo', 'PEN', 1000.00, 1000.00, true, '2026-10-29 19:48:20.920696+00');


--
-- Data for Name: loans; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."loans" ("id", "user_id", "lender_name", "currency", "initial_amount", "current_balance", "tea_percentage", "monthly_installment_amount", "total_installments", "remaining_installments", "payment_due_day", "is_active", "created_at") VALUES
	('cd7a59d1-b634-464d-bd3d-4f26a627de7b', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Scotiabank', 'PEN', 20317.32, 19240.05, 9.49, 424.16, 60, 56, 30, true, '2026-10-29 19:50:03.749107+00');


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."transactions" ("id", "user_id", "transaction_date", "type", "description", "amount", "currency", "category_id", "account_id", "destination_account_id", "credit_card_id", "applied_exchange_rate", "converted_amount", "is_installment", "is_shared_expense", "parent_transaction_id", "loan_id", "investment_id", "shared_split_id", "created_at") VALUES
	('6c8ca0fb-2d91-45aa-bedf-aca090f50af0', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', '2026-10-01 17:00:00+00', 'EXPENSE', 'Alquiler', 1600.00, 'PEN', '3266ce7e-b853-4e5e-b439-46e084cc6c9d', 'a474d53d-21ac-4f89-a2d8-585825b905d7', NULL, NULL, NULL, NULL, false, false, NULL, NULL, NULL, NULL, '2026-10-29 20:16:39.40369+00'),
	('9fdc89a3-e471-4c19-99f0-41298bc0d7ba', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', '2026-10-29 17:00:00+00', 'INCOME', 'Alimentos', 200.00, 'PEN', '4b2a1203-4191-4205-9aa1-5bcbffe56f68', '28d4a9e5-fa71-41d1-9c41-1cd2543d32a1', NULL, NULL, NULL, NULL, false, false, NULL, NULL, NULL, NULL, '2026-10-30 02:11:40.556899+00');


--
-- Data for Name: installment_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: investment_monthly_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: monthly_fixed_checklist; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."monthly_fixed_checklist" ("id", "user_id", "fixed_expense_id", "period_year_month", "estimated_amount", "actual_amount", "is_paid", "paid_at", "transaction_id", "created_at") VALUES
	('64593ccd-9a11-4d2c-9121-aef6e671acbf', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', '02368ada-2c2d-4168-a0f7-c66b0693c2f9', '2026-10', 1600.00, 1600.00, true, '2026-10-29 20:16:39.439+00', '6c8ca0fb-2d91-45aa-bedf-aca090f50af0', '2026-10-29 20:16:39.468405+00');


--
-- Data for Name: projected_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."projected_events" ("id", "user_id", "name", "expected_year_month", "amount", "currency", "category_id", "target_account_id", "is_recurring_monthly", "is_active", "created_at") VALUES
	('23d8892b-3e1e-4f40-9633-ed52287756ef', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Moto', '2026-12', 8500.00, 'PEN', '10d78fd9-6b6c-47ea-ba79-bf80ebe24ddb', NULL, false, true, '2026-10-29 21:00:27.946438+00'),
	('cb7a1c82-13d9-4ce5-a41e-f718b4f9b121', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Utilidades', '2027-02', 8000.00, 'PEN', NULL, NULL, false, true, '2026-10-29 21:04:36.260289+00'),
	('ddec2f11-449b-4c9f-90d0-55a12f84fa46', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Bono fin de año', '2026-12', 3000.00, 'PEN', '4b2a1203-4191-4205-9aa1-5bcbffe56f68', NULL, false, true, '2026-10-29 21:04:59.697308+00'),
	('c65b0913-5fab-4a86-b58b-72c5e0a2aebe', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Alimentos', '2026-10', 200.00, 'PEN', '4b2a1203-4191-4205-9aa1-5bcbffe56f68', NULL, true, true, '2026-10-29 21:05:19.236327+00'),
	('c377ba4a-f427-4396-a5f6-e559f90b7f48', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Maestría', '2026-11', 1650.00, 'PEN', '01f59664-04c1-42df-a99f-8f41c79bffee', NULL, true, true, '2026-10-29 21:22:44.633945+00'),
	('82622fb5-9a41-45e8-8a38-ad536a24f343', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Abono dxp', '2026-11', 424.16, 'PEN', '4b2a1203-4191-4205-9aa1-5bcbffe56f68', NULL, true, true, '2026-10-29 21:29:48.952925+00'),
	('bb4229d4-99e2-4d8e-8dbe-8895e0ec5d51', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Sueldo', '2026-11', 4500.00, 'PEN', '4b2a1203-4191-4205-9aa1-5bcbffe56f68', NULL, true, true, '2026-10-29 21:03:27.900363+00'),
	('c18702bb-a2bb-428e-857c-70749a3e7486', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Viaje diciembre', '2026-12', 1500.00, 'PEN', '83533159-7e5e-4cc3-a4b1-7026fe9a9d98', NULL, false, true, '2026-10-29 21:33:54.466409+00'),
	('b4c7c162-1216-4f54-a946-15a1883f19ea', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'CTS', '2026-11', 3075.00, 'PEN', 'ab2e23b9-0c5f-44d7-9b1e-cda8760cd842', NULL, false, true, '2026-10-29 20:56:19.631383+00'),
	('40489c5b-205e-4030-a85b-7c078318f415', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'CTS Mayo 27', '2027-05', 3075.00, 'PEN', 'ab2e23b9-0c5f-44d7-9b1e-cda8760cd842', NULL, false, true, '2026-10-29 21:23:55.750581+00'),
	('5c7bc8ef-52fc-40eb-938d-e74a8d26ea1d', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Grati diciembre', '2026-12', 6300.00, 'PEN', '7fd70096-b13c-4ce0-8dec-eeb7e88a606d', NULL, false, true, '2026-10-29 20:56:38.456462+00'),
	('44acb01b-c0b3-4885-8427-a67961a38488', '06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'Grati Julio 27', '2027-07', 6300.00, 'PEN', '7fd70096-b13c-4ce0-8dec-eeb7e88a606d', NULL, false, true, '2026-10-29 21:23:26.634731+00');


--
-- Data for Name: shared_expense_splits; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_settings" ("user_id", "base_currency", "include_cash_in_balance", "onboarding_completed", "created_at", "updated_at") VALUES
	('06e48eee-ef1b-4897-a9e8-85283a35ea0f', 'PEN', true, true, '2026-10-29 05:04:28.197614+00', '2026-10-29 05:04:28.197614+00');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 8, true);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict PoL9FqlmZT4XvJsV2OsmA7H5DuapGoWXBsdBxp1pXya4SOifvi7UYeyn1OzyJ6n

RESET ALL;
