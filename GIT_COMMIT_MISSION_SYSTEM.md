feat: implement comprehensive mission system with categories

- Create missions database schema with all required categories
- Implement 6 mission categories: Website, App, Business Plan, Real Estate, Transportation, Legal Filing
- Create dynamic mission modal with category selection and form generation
- Add mission management hook (useMissions) for CRUD operations
- Update Mission Objectives progress bar to use real data from missions
- Integrate mission creation with Supabase database
- Add proper validation and error handling for mission forms
- Create mission categories configuration with icons and field definitions
- Implement step-by-step mission creation flow (category selection -> form)
- Add mission statistics tracking and progress calculation

Database Schema:
- missions table with category, status, priority, budget fields
- mission_stats view for aggregated mission data
- RLS policies for client data security
- Indexes for performance optimization

Files created:
- database/create-missions-schema.sql - Complete database schema
- lib/config/mission-categories.ts - Mission categories configuration
- components/new-mission-modal.tsx - Dynamic mission creation modal
- hooks/use-missions.ts - Mission data management hook

Files modified:
- app/dashboard/client/page.tsx - Integrated mission system
- TODO.md - Updated with mission system features

The mission system now provides a complete workflow for clients
to create and manage missions across all business categories. 