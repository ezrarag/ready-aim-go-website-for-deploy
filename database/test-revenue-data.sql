-- Test script to add sample revenue data
-- Run this after creating the revenue tables to test the dashboard

-- First, get your client ID (replace with actual client ID)
-- SELECT id FROM profiles WHERE email = 'your-email@example.com';

-- Add sample revenue events (replace 'your-client-id' with actual client ID)
INSERT INTO revenue_events (
  client_id,
  stripe_payment_intent_id,
  amount,
  currency,
  status,
  source,
  description,
  metadata
) VALUES 
  ('your-client-id', 'pi_test_1', 2500.00, 'usd', 'succeeded', 'stripe', 'Website development payment', '{"project": "ezrahaugabrooks.com"}'),
  ('your-client-id', 'pi_test_2', 1500.00, 'usd', 'succeeded', 'stripe', 'Monthly subscription', '{"subscription": "monthly"}'),
  ('your-client-id', 'pi_test_3', 800.00, 'usd', 'succeeded', 'stripe', 'Consultation fee', '{"service": "consultation"}'),
  ('your-client-id', 'pi_test_4', 1200.00, 'usd', 'succeeded', 'stripe', 'SEO optimization', '{"service": "seo"}'),
  ('your-client-id', 'pi_test_5', 3000.00, 'usd', 'succeeded', 'stripe', 'E-commerce setup', '{"project": "ecommerce"}');

-- Verify the data was inserted
SELECT 
  client_id,
  COUNT(*) as total_events,
  SUM(amount) as total_amount,
  MAX(created_at) as last_payment
FROM revenue_events 
WHERE client_id = 'your-client-id'
GROUP BY client_id;

-- Check revenue summary
SELECT * FROM revenue_summary WHERE client_id = 'your-client-id';

-- Test the function
SELECT * FROM get_client_revenue('your-client-id'); 