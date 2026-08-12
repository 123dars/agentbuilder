docker exec n8n-clone-postgres-1 psql -U postgres -d local -c "SELECT u.id, u.email, m.org_id FROM auth.users u LEFT JOIN public.org_members m ON u.id = m.user_id;"
