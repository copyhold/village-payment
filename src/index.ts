import { Env, PurchaseRequest, FamilyData, PendingTransaction, ApprovalResponse, VendorInfo, TransactionStatus } from './types';
import { sendPushNotification } from './push-notifications';
import { validatePurchaseRequest, sanitizeInput } from './validation';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Set CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      let response: Response;

      switch (path) {
        case '/purchase-request':
          response = await handlePurchaseRequest(request, env);
          break;
        case '/approval-response':
          response = await handleApprovalResponse(request, env);
          break;
        case '/register-family':
          response = await handleFamilyRegistration(request, env);
          break;
        case '/vendor-form':
          response = await serveVendorForm(request, env);
          break;
        case '/parent-setup':
          response = await serveParentSetup(request, env);
          break;
        case '/family-status':
          response = await getFamilyStatus(request, env);
          break;
        case '/add-vendor':
          response = await addVendor(request, env);
          break;
        default:
          response = new Response('Not Found', { status: 404 });
      }

      // Add CORS headers to response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { 
        status: 500,
        headers: corsHeaders
      });
    }
  },

  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        const { transactionId } = message.body;
        
        // Check if transaction is still pending
        const pendingTx = await env.PENDING_KV.get(`pending:${transactionId}`);
        
        if (pendingTx) {
          const transaction: PendingTransaction = JSON.parse(pendingTx);
          
          // Auto-approve after 5-minute timeout
          await approveTransaction(transactionId, transaction, env, TransactionStatus.AUTO_APPROVED);
          
          console.log(`Auto-approved transaction ${transactionId} after timeout`);
        }
        
        message.ack();
      } catch (error) {
        console.error('Queue processing error:', error);
        message.retry();
      }
    }
  }
};

async function handlePurchaseRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const purchaseData: PurchaseRequest = await request.json();
  
  // Validate and sanitize input
  const validation = validatePurchaseRequest(purchaseData);
  if (!validation.isValid) {
    return new Response(JSON.stringify({ error: validation.error }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { number, surname, amount, vendorId, childName, description } = purchaseData;
  const familyKey = `${sanitizeInput(number)}-${sanitizeInput(surname)}`;

  // Get family data
  const familyData = await getFamilyData(familyKey, env);
  if (!familyData) {
    return new Response(JSON.stringify({ 
      status: 'error',
      message: 'Family not registered. Please contact administrator.' 
    }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get vendor info
  const vendorInfo = await getVendorInfo(vendorId, env);
  if (!vendorInfo) {
    return new Response(JSON.stringify({ 
      status: 'error',
      message: 'Vendor not found' 
    }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check vendor-specific or default spending limit
  const vendorSettings = familyData.vendors[vendorId];
  const spendingLimit = vendorSettings?.limit ?? familyData.defaultLimit;
  const currentVendorSpent = vendorSettings?.spent ?? 0;

  // Determine if approval is needed
  const requiresApproval = 
    vendorInfo.requiresApproval || 
    vendorSettings?.requireApproval ||
    (currentVendorSpent + amount > spendingLimit);

  if (!requiresApproval) {
    // Auto-approve
    await updateFamilySpending(familyKey, familyData, vendorId, amount, env);
    
    return new Response(JSON.stringify({
      status: 'approved',
      message: 'Purchase approved automatically',
      newBalance: currentVendorSpent + amount,
      limit: spendingLimit
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Create pending transaction
  const transactionId = crypto.randomUUID();
  const pendingTransaction: PendingTransaction = {
    familyKey,
    amount,
    vendorId,
    vendorName: vendorInfo.name,
    timestamp: Date.now(),
    childName,
    description
  };

  await env.PENDING_KV.put(
    `pending:${transactionId}`, 
    JSON.stringify(pendingTransaction),
    { expirationTtl: 600 } // 10 minutes expiration
  );

  // Send push notification to parent
  await sendPushNotification(
    familyData.parentPushSubscription,
    {
      title: 'Purchase Approval Needed',
      body: `${childName || 'Child'} wants to spend $${amount} at ${vendorInfo.name}`,
      data: {
        transactionId,
        amount,
        vendorName: vendorInfo.name,
        childName,
        description,
        currentSpent: currentVendorSpent,
        limit: spendingLimit
      }
    },
    env
  );

  // Schedule auto-approval after 5 minutes
  await env.AUTO_APPROVAL_QUEUE.send({
    transactionId
  }, {
    delaySeconds: 300 // 5 minutes
  });

  return new Response(JSON.stringify({
    status: 'pending',
    message: 'Approval request sent to parent. Will auto-approve in 5 minutes if no response.',
    transactionId
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleApprovalResponse(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const response: ApprovalResponse = await request.json();
  const { transactionId, action, reason } = response;

  const pendingTx = await env.PENDING_KV.get(`pending:${transactionId}`);
  if (!pendingTx) {
    return new Response(JSON.stringify({ 
      error: 'Transaction not found or already processed' 
    }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const transaction: PendingTransaction = JSON.parse(pendingTx);

  if (action === 'approve') {
    await approveTransaction(transactionId, transaction, env, TransactionStatus.APPROVED);
    return new Response(JSON.stringify({ 
      status: 'approved',
      message: 'Transaction approved' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } else {
    await declineTransaction(transactionId, transaction, env, reason);
    return new Response(JSON.stringify({ 
      status: 'declined',
      message: 'Transaction declined' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Approve transaction and log to D1
async function approveTransaction(
  transactionId: string, 
  transaction: PendingTransaction, 
  env: Env,
  status: TransactionStatus
): Promise<void> {
  const familyData = await getFamilyData(transaction.familyKey, env);
  if (!familyData) return;
  // Remove from pending
  await env.PENDING_KV.delete(`pending:${transactionId}`);
  // Log transaction to D1
  // Find family_id
  const [number, surname] = transaction.familyKey.split('-');
  const famRow = await env.DB.prepare('SELECT family_id FROM families WHERE number = ? AND surname = ? LIMIT 1').bind(number, surname).first();
  if (famRow) {
    await env.DB.prepare(
      'INSERT INTO transactions (family_id, amount, vendor_name, status, requested_at, responded_at, timeout_approved) VALUES (?, ?, ?, ?, ?, ?, ?)' 
    ).bind(
      famRow.family_id,
      transaction.amount,
      transaction.vendorName,
      status,
      new Date(transaction.timestamp).toISOString(),
      new Date().toISOString(),
      status === TransactionStatus.AUTO_APPROVED
    ).run();
  }
}

// Decline transaction and log to D1
async function declineTransaction(
  transactionId: string, 
  transaction: PendingTransaction, 
  env: Env,
  reason?: string
): Promise<void> {
  await env.PENDING_KV.delete(`pending:${transactionId}`);
  // Log declined transaction to D1
  const [number, surname] = transaction.familyKey.split('-');
  const famRow = await env.DB.prepare('SELECT family_id FROM families WHERE number = ? AND surname = ? LIMIT 1').bind(number, surname).first();
  if (famRow) {
    await env.DB.prepare(
      'INSERT INTO transactions (family_id, amount, vendor_name, status, requested_at, responded_at, timeout_approved) VALUES (?, ?, ?, ?, ?, ?, ?)' 
    ).bind(
      famRow.family_id,
      transaction.amount,
      transaction.vendorName,
      'declined',
      new Date(transaction.timestamp).toISOString(),
      new Date().toISOString(),
      false
    ).run();
  }
}

// Fetch family data from D1
async function getFamilyData(familyKey: string, env: Env): Promise<FamilyData | null> {
  // familyKey is "number-surname" (normalized)
  const [number, surname] = familyKey.split('-');
  const stmt = env.DB.prepare(
    'SELECT * FROM families WHERE number = ? AND surname = ? LIMIT 1'
  );
  const result = await stmt.bind(number, surname).first();
  if (!result) return null;
  // Map DB row to FamilyData (add more fields as needed)
  return {
    parentPushSubscription: result.parent_contact ? JSON.parse(result.parent_contact) : undefined,
    defaultLimit: result.spending_limit || 0,
    totalSpent: 0, // You may want to SUM transactions for this family
    vendors: {}, // Optionally, fetch vendor-specific limits
    parentName: result.parent_name,
    childName: result.child_name
  };
}

async function getVendorInfo(vendorId: string, env: Env): Promise<VendorInfo | null> {
  const data = await env.VENDORS_KV.get(`vendor:${vendorId}`);
  return data ? JSON.parse(data) : null;
}

// Update family spending in D1 (optionally update limits, but log spending via transactions)
async function updateFamilySpending(
  familyKey: string,
  familyData: FamilyData,
  vendorId: string,
  amount: number,
  env: Env
): Promise<void> {
  // No-op: spending is tracked via transactions table in D1
  // Optionally, you could update a summary column in families if needed
  return;
}

// Additional handler functions would be implemented here...
// Register new family in D1
async function handleFamilyRegistration(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const data = await request.json();
  // Validate input (reuse your validation)
  // Assume: number, surname, parentPushSubscription, spending_limit, parent_name, child_name
  const stmt = env.DB.prepare(
    'INSERT INTO families (number, surname, parent_contact, spending_limit, parent_name, child_name) VALUES (?, ?, ?, ?, ?, ?)' 
  );
  await stmt.bind(
    data.number,
    data.surname,
    JSON.stringify(data.parentPushSubscription || null),
    data.spending_limit || 0,
    data.parent_name || null,
    data.child_name || null
  ).run();
  return new Response(JSON.stringify({ status: 'ok' }), { headers: { 'Content-Type': 'application/json' } });
}

async function serveVendorForm(request: Request, env: Env): Promise<Response> {
  // Serve the vendor form HTML
  return new Response('Vendor form HTML - to be implemented');
}

async function serveParentSetup(request: Request, env: Env): Promise<Response> {
  // Serve parent setup page
  return new Response('Parent setup page - to be implemented');
}

async function getFamilyStatus(request: Request, env: Env): Promise<Response> {
  // Get family spending status
  return new Response('Family status endpoint - to be implemented');
}

async function addVendor(request: Request, env: Env): Promise<Response> {
  // Add new vendor
  return new Response('Add vendor endpoint - to be implemented');
}