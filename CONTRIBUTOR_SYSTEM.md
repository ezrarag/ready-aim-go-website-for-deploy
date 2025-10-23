# Contributor System Documentation

## Overview

This system allows you to mark users as contributors and attribute them to projects. Contributors can then display their work on personal websites by fetching data from your agency's Firebase database.

## Database Schema

### Collections

1. **profiles** (existing)
   - Added `is_contributor` boolean field
   - Marks users who can be attributed to projects

2. **project_contributors** (new)
   - Junction collection linking projects to contributors
   - Tracks role, contribution percentage, and display order

3. **contributor_projects** (view)
   - Convenient view for fetching contributor data
   - Joins all necessary collections

### Functions

- `get_projects_by_contributor(contributor_email)` - Get all projects for a contributor
- `get_contributors_by_project(project_id)` - Get all contributors for a project

## API Endpoints

### Get Contributor Projects
```
GET /api/contributors/{email}/projects
```

Returns all projects where the contributor was involved.

### Get Project Contributors
```
GET /api/projects/{id}/contributors
```

Returns all contributors for a specific project.

## Usage Examples

### 1. Mark a User as Contributor

```javascript
// In Firebase console or via admin SDK
const userRef = db.collection('profiles').doc('user-id');
await userRef.update({ is_contributor: true });
```

### 2. Add Contributor to Project

```javascript
// In Firebase console or via admin SDK
await db.collection('project_contributors').add({
  project_id: 'project-uuid',
  contributor_id: 'contributor-profile-uuid',
  role: 'developer',
  contribution_percentage: 80,
  attribution_order: 1
});
```

### 3. Use on Personal Website

#### Option A: Same Firebase Project
```tsx
import { ContributorPortfolio } from '@/components/contributor-portfolio';

function MyPortfolio() {
  return (
    <ContributorPortfolio 
      contributorEmail="ezra@example.com"
      title="My Work"
    />
  );
}
```

#### Option B: Cross-Project (Personal Website)
```tsx
import { ContributorPortfolio } from '@/components/contributor-portfolio';

function MyPortfolio() {
  return (
    <ContributorPortfolio 
      contributorEmail="ezra@example.com"
      firebaseConfig={{
        apiKey: "your-api-key",
        authDomain: "your-project.firebaseapp.com",
        projectId: "your-project-id"
      }}
      title="My Work"
    />
  );
}
```

### 4. Fetch Data Programmatically

```tsx
import { useContributorProjects } from '@/hooks/use-contributor-projects';

function MyComponent() {
  const { projects, loading, error } = useContributorProjects(
    'ezra@example.com',
    firebaseConfig
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {projects.map(project => (
        <div key={project.project_id}>
          <h3>{project.project_title}</h3>
          <p>{project.project_description}</p>
          <span>Role: {project.role}</span>
        </div>
      ))}
    </div>
  );
}
```

## Security

### Security Rules

- **Public Read Access**: Anyone can read contributor data (for portfolio display)
- **Authenticated Write Access**: Only project owners and contributors can modify data

### Cross-Project Access

When using the cross-project approach:
1. Use only the **public API key** (never admin SDK keys)
2. Set up security rules to allow public read access
3. Only expose data you want to be public

## Setup Instructions

### 1. Run Database Migration

Execute the migration script in `database/add-contributor-role.js` in your Firebase console.

### 2. Mark Users as Contributors

```javascript
const batch = db.batch();
const profilesRef = db.collection('profiles');
const emails = ['ezra@example.com', 'other@example.com'];

emails.forEach(email => {
  const profileQuery = profilesRef.where('email', '==', email);
  profileQuery.get().then(snapshot => {
    snapshot.forEach(doc => {
      batch.update(doc.ref, { is_contributor: true });
    });
  });
});

await batch.commit();
```

### 3. Add Contributors to Projects

Use the dashboard interface or run JavaScript:

```javascript
const projectRef = db.collection('projects').where('title', '==', 'Ezra Hauga Brooks Website');
const contributorRef = db.collection('profiles').where('email', '==', 'ezra@example.com');

const [projectSnapshot, contributorSnapshot] = await Promise.all([
  projectRef.get(),
  contributorRef.get()
]);

const project = projectSnapshot.docs[0];
const contributor = contributorSnapshot.docs[0];

await db.collection('project_contributors').add({
  project_id: project.id,
  contributor_id: contributor.id,
  role: 'developer',
  contribution_percentage: 80,
  attribution_order: 1
});
```

### 4. Test the API

```bash
curl "https://your-project.firebaseapp.com/api/contributors/ezra@example.com/projects"
```

## Dashboard Integration

The `ProjectContributorsManager` component can be added to project detail pages in your dashboard to manage contributors.

## Troubleshooting

### Common Issues

1. **No projects returned**: Check that the user is marked as `is_contributor = true`
2. **Permission denied**: Ensure security rules are set up correctly
3. **Cross-project not working**: Verify the Firebase config and API key are correct

### Debug Queries

```javascript
// Check if user is contributor
const profileQuery = db.collection('profiles').where('email', '==', 'ezra@example.com');
const profileSnapshot = await profileQuery.get();
console.log(profileSnapshot.docs[0]?.data());

// Check project contributors
const contributorsQuery = db.collection('project_contributors')
  .where('contributor_id', '==', contributorId);
const contributorsSnapshot = await contributorsQuery.get();
console.log(contributorsSnapshot.docs.map(doc => doc.data()));
``` 