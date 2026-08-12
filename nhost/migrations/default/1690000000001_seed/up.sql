-- Seed data for Final Task Scenario

-- Org A and Org B
INSERT INTO organizations (id, name, quota_limit) VALUES 
('11111111-1111-1111-1111-111111111111', 'Org A (TechCorp)', 100),
('22222222-2222-2222-2222-222222222222', 'Org B (BizInc)', 100);

-- Workflow in Org A
INSERT INTO workflows (id, org_id, name, description) VALUES
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Customer Onboarding Agent', 'AI driven pipeline with approval gate');

-- Steps in Org A workflow
INSERT INTO workflow_steps (id, workflow_id, step_order, type, config) VALUES
('44444444-4444-4444-4444-444444444440', '33333333-3333-3333-3333-333333333333', 1, 'http_request', '{"url": "https://jsonplaceholder.typicode.com/users/1", "method": "GET"}'),
('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333333', 2, 'llm_call', '{"prompt": "Summarize the user profile fetched in step 1"}'),
('44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333333', 3, 'conditional_branch', '{"condition": "input.response.length > 10"}'),
('44444444-4444-4444-4444-444444444443', '33333333-3333-3333-3333-333333333333', 4, 'approval_gate', '{"message": "Please approve the AI summary"}'),
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 5, 'db_write', '{"table": "audit_logs", "action": "insert"}');

-- Triggers for Org A workflow (Manual and Webhook)
INSERT INTO workflow_triggers (id, workflow_id, type, config) VALUES
('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'manual', '{}'),
('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'webhook', '{"path": "/webhook/33333333-3333-3333-3333-333333333333"}');

-- Note: The users and org_members will need to be seeded after Nhost auth users are created via UI.
-- For demo purposes, users create accounts and then we run a script to add them to org_members.
