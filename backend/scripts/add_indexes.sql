-- Performance Review: Add indexes for frequent lookups

-- Deployments table frequently queries by website_id and status
CREATE INDEX IF NOT EXISTS idx_deployments_website_status ON deployments(website_id, status);

-- Domains table frequently queries by website_id and status
CREATE INDEX IF NOT EXISTS idx_domains_website_status ON domains(website_id, status);

-- Websites table frequently queries by user_id
CREATE INDEX IF NOT EXISTS idx_websites_user_id ON websites(user_id);
