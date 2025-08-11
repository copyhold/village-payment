self.addEventListener('install', function(event) {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  console.log('Push event received:', event);
  
  if (!event.data) {
    console.log('No data received');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push data:', data);

    const notificationOptions = {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/badge-72x72.png',
      data: data.data || {},
      requireInteraction: data.requireInteraction || false,
      tag: data.tag || 'default',
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(data.title, notificationOptions)
    );
  } catch (error) {
    console.error('Error processing push notification:', error);
    
    event.waitUntil(
      self.registration.showNotification('VPCS Notification', {
        body: 'You have a new notification',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png'
      })
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === 'approve' || action === 'decline') {
    const transactionId = data.transactionId;
    
    if (transactionId) {
      event.waitUntil(
        fetch(`/api/push/respond/${transactionId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getStoredToken()}`
          },
          body: JSON.stringify({
            action: action,
            reason: action === 'decline' ? 'Declined via notification' : null
          })
        }).then(response => {
          if (response.ok) {
            return self.registration.showNotification(
              action === 'approve' ? 'Purchase Approved' : 'Purchase Declined',
              {
                body: action === 'approve' 
                  ? 'The purchase has been approved.' 
                  : 'The purchase has been declined.',
                icon: '/icon-192x192.png',
                badge: '/badge-72x72.png',
                tag: 'approval-result'
              }
            );
          } else {
            console.error('Failed to respond to transaction:', response.status);
            return self.registration.showNotification(
              'Error',
              {
                body: 'Failed to process your response. Please try again.',
                icon: '/icon-192x192.png',
                badge: '/badge-72x72.png',
                tag: 'error'
              }
            );
          }
        }).catch(error => {
          console.error('Error responding to transaction:', error);
          return self.registration.showNotification(
            'Error',
            {
              body: 'Failed to process your response. Please try again.',
              icon: '/icon-192x192.png',
              badge: '/badge-72x72.png',
              tag: 'error'
            }
          );
        })
      );
    }
  } else {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event);
  
  const data = event.notification.data;
  if (data && data.type === 'transaction_approval') {
    console.log('Transaction approval notification was closed without action');
  }
});

function getStoredToken() {
  return new Promise((resolve) => {
    self.clients.matchAll().then(clients => {
      for (const client of clients) {
        client.postMessage({ type: 'GET_TOKEN' });
      }
      setTimeout(() => resolve(null), 100);
    });
  });
}

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'TOKEN_RESPONSE') {
    self.token = event.data.token;
  }
});
