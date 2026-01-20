-- Assign admin role to user beltovbogdan@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('1e12c3cd-aa4b-4914-a249-9efbe8f86eec', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;