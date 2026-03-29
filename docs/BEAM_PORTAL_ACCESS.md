# BEAM Portal Access

This dashboard feature manages BEAM portal access through the shared Firestore collection `ragAllowlist`.

## Firestore collection

- Collection: `ragAllowlist`
- Document ID: lowercase email with `.` replaced by `_`
- Example: `user@paynepros.com` -> `user@paynepros_com`

## Expected document shape

```ts
type AllowlistEntry = {
  email: string
  clientName: string
  clientSlug: string
  addedBy: string
  addedAt: string
  active: boolean
  notes: string
}
```

## Firestore rules

This repo does not currently contain a checked-in `firestore.rules` file, so apply the following in the shared Firebase project:

```txt
match /ragAllowlist/{docId} {
  allow read: if request.auth != null
    && (
      docId == request.auth.token.email.replace('.', '_')
      || isAdmin()
    );
  allow write: if isAdmin();
}
```

## Shared project check

Confirm the ReadyAimGo and BEAM apps point at the same Firebase project ID before testing access flow end to end.
