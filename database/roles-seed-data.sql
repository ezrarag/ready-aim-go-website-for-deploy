-- Seed data for roles table with realistic business scenarios
-- Note: Replace UUIDs with actual client IDs from your users table

-- Sam's Ice Cream Truck roles
INSERT INTO public.roles (client_id, title, description, category, skills, pay_range, deadline, location, workstream, visibility, tags, status) VALUES
('00000000-0000-0000-0000-000000000001', 'Ice Cream Truck Driver', 'Drive our colorful ice cream truck through neighborhoods, play music, and serve delicious treats to kids and families. Must have clean driving record and love working with children.', 'Logistics', ARRAY['Commercial Driving', 'Customer Service', 'Cash Handling'], '$18-22/hour', '2024-03-15', 'Atlanta Metro Area', 'Transport', 'Public', ARRAY['driving', 'food-service', 'seasonal'], 'Live'),
('00000000-0000-0000-0000-000000000001', 'Social Media Content Creator', 'Create fun, engaging content for our ice cream truck social media. Film daily adventures, customer reactions, and behind-the-scenes content.', 'Design', ARRAY['Video Editing', 'Social Media', 'Photography'], '$25-35/hour', '2024-03-01', 'Remote/On-location', 'Creative', 'Public', ARRAY['social-media', 'content', 'video'], 'Live');

-- Lanvi Music Teacher roles  
INSERT INTO public.roles (client_id, title, description, category, skills, pay_range, deadline, location, workstream, visibility, tags, status) VALUES
('00000000-0000-0000-0000-000000000002', 'Piano Lesson Assistant', 'Help with beginner piano students, organize sheet music, and assist during ensemble rehearsals. Music education background preferred.', 'Admin', ARRAY['Music Education', 'Piano', 'Organization'], '$20-25/hour', '2024-02-28', 'Music Studio, Atlanta', 'Admin', 'Public', ARRAY['music', 'education', 'part-time'], 'Live'),
('00000000-0000-0000-0000-000000000002', 'Ensemble Performance Videographer', 'Record student recitals and ensemble performances. Edit videos for families and promotional use.', 'Design', ARRAY['Video Production', 'Audio Recording', 'Editing'], '$40-60/event', '2024-04-01', 'Various Venues', 'Media', 'Public', ARRAY['video', 'music', 'events'], 'Draft');

-- Downtown ATL Coffee Shop roles
INSERT INTO public.roles (client_id, title, description, category, skills, pay_range, deadline, location, workstream, visibility, tags, status) VALUES
('00000000-0000-0000-0000-000000000003', 'Barista - Morning Shift', 'Craft exceptional coffee drinks, provide friendly customer service, and maintain clean workspace. Latte art skills a plus!', 'Retail', ARRAY['Coffee Making', 'Customer Service', 'POS Systems'], '$16-20/hour + tips', '2024-02-25', 'Downtown Atlanta', 'Retail', 'Public', ARRAY['coffee', 'customer-service', 'morning'], 'Live'),
('00000000-0000-0000-0000-000000000003', 'Coffee Shop Website Redesign', 'Modernize our website with online ordering, menu updates, and mobile optimization. Include loyalty program integration.', 'Web Dev', ARRAY['React', 'E-commerce', 'Mobile Design'], '$2000-3500', '2024-03-20', 'Remote', 'Creative', 'BEAM Members', ARRAY['website', 'ecommerce', 'mobile'], 'Live');

-- Fruition Hat Co. roles
INSERT INTO public.roles (client_id, title, description, category, skills, pay_range, deadline, location, workstream, visibility, tags, status) VALUES
('00000000-0000-0000-0000-000000000004', 'Product Photography Specialist', 'Photograph our hat collections for e-commerce and social media. Style products, manage lighting, and deliver edited photos.', 'Design', ARRAY['Product Photography', 'Photo Editing', 'Styling'], '$50-75/hour', '2024-03-10', 'Atlanta Studio', 'Creative', 'Public', ARRAY['photography', 'ecommerce', 'fashion'], 'Live'),
('00000000-0000-0000-0000-000000000004', 'Inventory Management Assistant', 'Help organize warehouse, track inventory levels, and prepare shipments. Detail-oriented person needed for growing hat business.', 'Product Prep', ARRAY['Inventory Management', 'Organization', 'Shipping'], '$18-22/hour', '2024-02-20', 'Warehouse, Atlanta', 'Operations', 'Public', ARRAY['inventory', 'warehouse', 'organization'], 'Filled');

-- RedSquare Transportation roles
INSERT INTO public.roles (client_id, title, description, cache, skills, pay_range, deadline, location, workstream, visibility, tags, status) VALUES
('00000000-0000-0000-0000-000000000005', 'Logistics Coordinator', 'Coordinate delivery routes, manage driver schedules, and optimize transportation efficiency. Experience with logistics software preferred.', 'Logistics', ARRAY['Route Planning', 'Scheduling', 'Logistics Software'], '$45000-55000/year', '2024-03-05', 'Atlanta Office', 'Operations', 'Public', ARRAY['logistics', 'coordination', 'full-time'], 'Live'),
('00000000-0000-0000-0000-000000000005', 'Fleet Management App Development', 'Build mobile app for drivers to track routes, report issues, and communicate with dispatch. iOS and Android needed.', 'Web Dev', ARRAY['React Native', 'Mobile Development', 'GPS Integration'], '$8000-12000', '2024-04-15', 'Remote', 'Creative', 'BEAM Members', ARRAY['mobile-app', 'fleet', 'gps'], 'Draft');

-- Ariel's Grandma Fitness Brand roles
INSERT INTO public.roles (client_id, title, description, category, skills, pay_range, deadline, location, workstream, visibility, tags, status) VALUES
('00000000-0000-0000-0000-000000000006', 'Senior Fitness Class Instructor', 'Lead gentle fitness classes for seniors. Create safe, fun workouts that build strength and community. Certification required.', 'Events', ARRAY['Fitness Instruction', 'Senior Care', 'Group Leadership'], '$30-40/class', '2024-02-22', 'Community Centers', 'Events', 'Public', ARRAY['fitness', 'seniors', 'health'], 'Live'),
('00000000-0000-0000-0000-000000000006', 'Brand Identity Design Package', 'Create complete brand identity for senior fitness brand including logo, colors, and marketing materials. Warm, approachable aesthetic needed.', 'Design', ARRAY['Brand Design', 'Logo Design', 'Marketing Materials'], '$1500-2500', '2024-03-30', 'Remote', 'Creative', 'Public', ARRAY['branding', 'design', 'seniors'], 'Live');

-- Britney Content Creator roles
INSERT INTO public.roles (client_id, title, description, category, skills, pay_range, deadline, location, workstream, visibility, tags, status) VALUES
('00000000-0000-0000-0000-000000000007', 'Video Editor for YouTube Channel', 'Edit weekly YouTube videos with engaging cuts, graphics, and sound design. Experience with lifestyle/business content preferred.', 'Design', ARRAY['Video Editing', 'Motion Graphics', 'YouTube Optimization'], '$35-50/video', '2024-02-28', 'Remote', 'Media', 'Public', ARRAY['video-editing', 'youtube', 'content'], 'Live'),
('00000000-0000-0000-0000-000000000007', 'Personal Assistant - Content Planning', 'Help organize content calendar, research topics, and manage social media scheduling. Detail-oriented multitasker needed.', 'Admin', ARRAY['Content Planning', 'Social Media', 'Organization'], '$25-30/hour', '2024-03-01', 'Remote/Hybrid', 'Admin', 'Public', ARRAY['assistant', 'content', 'social-media'], 'Draft');

-- Colin & Wife Event Business roles
INSERT INTO public.roles (client_id, title, description, category, skills, pay_range, deadline, location, workstream, visibility, tags, status) VALUES
('00000000-0000-0000-0000-000000000008', 'Wedding Photographer Assistant', 'Second shooter for wedding photography. Help with equipment, backup shots, and guest coordination during events.', 'Events', ARRAY['Photography', 'Event Coordination', 'Customer Service'], '$200-300/event', '2024-02-26', 'Atlanta Metro', 'Events', 'Public', ARRAY['photography', 'weddings', 'events'], 'Live'),
('00000000-0000-0000-0000-000000000008', 'Event Planning Software Development', 'Build custom CRM for managing wedding clients, vendors, and timelines. Include payment tracking and communication tools.', 'Web Dev', ARRAY['Full Stack Development', 'CRM Development', 'Payment Integration'], '$5000-8000', '2024-05-01', 'Remote', 'Creative', 'BEAM Members', ARRAY['crm', 'events', 'software'], 'Live');
