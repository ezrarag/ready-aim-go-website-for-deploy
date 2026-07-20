import fs from 'fs';
import path from 'path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Load env variables
const envPath = '/Users/ehauga/Desktop/local dev/clients.readyaimgo.biz/.env.local';
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
  if (match) {
    let key = match[1];
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    value = value.replace(/\\n/g, '\n');
    process.env[key] = value;
  }
});

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

initializeApp({
  credential: cert({
    projectId,
    clientEmail,
    privateKey,
  }),
});

const db = getFirestore();

async function main() {
  console.log("=== QUERYING CLIENTS & INVOICES ===");
  const clientsSnap = await db.collection("clients").get();
  console.log(`Total clients: ${clientsSnap.size}`);
  
  for (const clientDoc of clientsSnap.docs) {
    const clientId = clientDoc.id;
    const clientData = clientDoc.data();
    console.log(`\nClient ID: ${clientId} (${clientData.name || 'Unnamed'})`);
    
    const invoicesSnap = await db.collection("clients").doc(clientId).collection("invoices").get();
    console.log(`  Total invoices: ${invoicesSnap.size}`);
    
    for (const invDoc of invoicesSnap.docs) {
      const invData = invDoc.data();
      console.log(`    - Invoice ID: ${invDoc.id}`);
      console.log(`      Number: ${invData.invoiceNumber}`);
      console.log(`      Title: ${invData.title}`);
      console.log(`      Status: ${invData.status}`);
      
      const html = invData.renderedHtml || "";
      if (html) {
        // Let's search for control characters in the HTML
        for (let i = 0; i < html.length; i++) {
          const code = html.charCodeAt(i);
          // Allow standard whitespace: space (32), carriage return (13), line feed (10), tab (9)
          if (code < 32 && code !== 10 && code !== 13 && code !== 9) {
            console.log(`      [WARNING] Found illegal control character at index ${i} (hex: ${code.toString(16)}):`);
            console.log(`      Context: "${html.slice(Math.max(0, i - 15), i + 15)}"`);
          }
        }
      } else {
        console.log(`      Rendered HTML is empty or missing`);
      }
    }
  }
}

main().catch(console.error);
