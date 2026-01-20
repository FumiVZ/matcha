let heartbeatInterval = null;

function startHeartbeat() {
  if (heartbeatInterval) return;
  
  sendHeartbeat();
  
  heartbeatInterval = setInterval(sendHeartbeat, 45000);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

async function sendHeartbeat() {
  try {
    await fetch('/users/api/heartbeat', {
      method: 'POST',
      credentials: 'include' 
    });
  } catch (error) {
    console.error('Heartbeat failed:', error);
  }
}

window.addEventListener('beforeunload', stopHeartbeat);

startHeartbeat();