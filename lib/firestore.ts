import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

let app: App | null = null
let db: Firestore | null = null

export function getFirestoreDb(): Firestore | null {
  if (db) {
    return db
  }

  // Initialize Firebase Admin if not already initialized
  if (getApps().length === 0) {
    // Check for service account key in environment variables
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    
    if (serviceAccountKey) {
      // Parse JSON service account key
      try {
        const serviceAccount = JSON.parse(serviceAccountKey)
        app = initializeApp({
          credential: cert(serviceAccount),
        })
      } catch (error) {
        console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error)
        // Return null instead of throwing during build time
        return null
      }
    } else {
      // Fallback: use individual credential fields
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      
      // Validate required fields - return null instead of throwing during build time
      if (!projectId || !clientEmail || !privateKey) {
        // Don't throw during build - return null and let runtime handle it
        return null
      }
      
      try {
        app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        })
      } catch (error) {
        console.error('Error initializing Firebase Admin:', error)
        // Return null instead of throwing during build time
        return null
      }
    }
  } else {
    app = getApps()[0]
  }

  // Ensure app was successfully initialized
  if (!app) {
    // Return null instead of throwing during build time
    return null
  }

  db = getFirestore(app)
  return db
}

// Partner types
export interface Partner {
  id?: string
  slug: string
  name: string
  contactEmail?: string
  contactName?: string
  orgType: string
  createdAt?: FirebaseFirestore.Timestamp | Date
}

export interface Contribution {
  id?: string
  partnerId: string
  partnerSlug: string
  stripeSessionId: string
  amountCents: number
  currency: string
  purpose: string
  userEmail?: string
  userName?: string
  createdAt?: FirebaseFirestore.Timestamp | Date
}

// Partner helpers
export async function getPartnerBySlug(slug: string): Promise<Partner | null> {
  const db = getFirestoreDb()
  if (!db) {
    console.error('Firebase not initialized - cannot fetch partner')
    return null
  }
  const partnersRef = db.collection('partners')
  const snapshot = await partnersRef.where('slug', '==', slug).limit(1).get()
  
  if (snapshot.empty) {
    return null
  }
  
  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() } as Partner
}

export async function getPartnerById(id: string): Promise<Partner | null> {
  const db = getFirestoreDb()
  if (!db) {
    console.error('Firebase not initialized - cannot fetch partner')
    return null
  }
  const doc = await db.collection('partners').doc(id).get()
  
  if (!doc.exists) {
    return null
  }
  
  return { id: doc.id, ...doc.data() } as Partner
}

export async function getAllPartners(): Promise<Partner[]> {
  const db = getFirestoreDb()
  if (!db) {
    console.error('Firebase not initialized - cannot fetch partners')
    return []
  }
  const snapshot = await db.collection('partners').orderBy('createdAt', 'desc').get()
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Partner))
}

// Contribution helpers
export async function createContribution(contribution: Omit<Contribution, 'id' | 'createdAt'>): Promise<string> {
  const db = getFirestoreDb()
  if (!db) {
    throw new Error('Firebase not initialized - cannot create contribution')
  }
  const docRef = await db.collection('contributions').add({
    ...contribution,
    createdAt: new Date(),
  })
  return docRef.id
}

export async function getContributionBySessionId(sessionId: string): Promise<Contribution | null> {
  const db = getFirestoreDb()
  if (!db) {
    console.error('Firebase not initialized - cannot fetch contribution')
    return null
  }
  const snapshot = await db.collection('contributions')
    .where('stripeSessionId', '==', sessionId)
    .limit(1)
    .get()
  
  if (snapshot.empty) {
    return null
  }
  
  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() } as Contribution
}

export async function getContributionsByPartnerId(partnerId: string): Promise<Contribution[]> {
  const db = getFirestoreDb()
  if (!db) {
    console.error('Firebase not initialized - cannot fetch contributions')
    return []
  }
  const snapshot = await db.collection('contributions')
    .where('partnerId', '==', partnerId)
    .orderBy('createdAt', 'desc')
    .get()
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contribution))
}

export async function getContributionsByPartnerSlug(partnerSlug: string): Promise<Contribution[]> {
  const db = getFirestoreDb()
  if (!db) {
    console.error('Firebase not initialized - cannot fetch contributions')
    return []
  }
  const snapshot = await db.collection('contributions')
    .where('partnerSlug', '==', partnerSlug)
    .get()
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contribution))
}

// Seed Carlot partner if it doesn't exist
export async function ensureCarlotPartner(): Promise<void> {
  const db = getFirestoreDb()
  if (!db) {
    console.error('Firebase not initialized - cannot seed partner')
    return
  }
  const existing = await getPartnerBySlug('carlot')
  
  if (!existing) {
    await db.collection('partners').add({
      slug: 'carlot',
      name: 'Dorve Church Choir',
      contactName: 'Carlot Dorve',
      contactEmail: 'carlot@example.com',
      orgType: 'church_choir',
      createdAt: new Date(),
    })
    console.log('Created Carlot partner seed')
  }
}


