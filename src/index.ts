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

async function approveTransaction(
  transactionId: string, 
  transaction: PendingTransaction, 
  env: Env,
  status: TransactionStatus
): Promise<void> {
  const familyData = await getFamilyData(transaction.familyKey, env);
  if (!familyData) return;

  // Update spending
  await updateFamilySpending(
    transaction.familyKey, 
    familyData, 
    transaction.vendorId, 
    transaction.amount, 
    env
  );

  // Remove from pending
  await env.PENDING_KV.delete(`pending:${transactionId}`);

  // Log transaction (optional - could store in another KV namespace)
  await env.PENDING_KV.put(
    `completed:${transactionId}`,
    JSON.stringify({
      ...transaction,
      status,
      completedAt: Date.now()
    }),
    { expirationTtl: 86400 * 30 } // Keep for 30 days
  );
}

async function declineTransaction(
  transactionId: string, 
  transaction: PendingTransaction, 
  env: Env,
  reason?: string
): Promise<void> {
  // Remove from pending
  await env.PENDING_KV.delete(`pending:${transactionId}`);

  // Log declined transaction
  await env.PENDING_KV.put(
    `completed:${transactionId}`,
    JSON.stringify({
      ...transaction,
      status: TransactionStatus.DECLINED,
      reason,
      completedAt: Date.now()
    }),
    { expirationTtl: 86400 * 30 } // Keep for 30 days
  );
}

async function getFamilyData(familyKey: string, env: Env): Promise<FamilyData | null> {
  const data = await env.FAMILIES_KV.get(`family:${familyKey}`);
  return data ? JSON.parse(data) : null;
}

async function getVendorInfo(vendorId: string, env: Env): Promise<VendorInfo | null> {
  const data = await env.VENDORS_KV.get(`vendor:${vendorId}`);
  return data ? JSON.parse(data) : null;
}

async function updateFamilySpending(
  familyKey: string,
  familyData: FamilyData,
  vendorId: string,
  amount: number,
  env: Env
): Promise<void> {
  // Update vendor-specific spending
  if (!familyData.vendors[vendorId]) {
    familyData.vendors[vendorId] = { limit: familyData.defaultLimit, spent: 0 };
  }
  
  familyData.vendors[vendorId].spent += amount;
  familyData.totalSpent += amount;

  await env.FAMILIES_KV.put(`family:${familyKey}`, JSON.stringify(familyData));
}

// Additional handler functions would be implemented here...
async function handleFamilyRegistration(request: Request, env: Env): Promise<Response> {
  // Implementation for family registration
  return new Response('Family registration endpoint - to be implemented');
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