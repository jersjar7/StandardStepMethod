self.postMessage('Worker script loaded');

// Listen for messages
self.onmessage = function(e) {
  // Echo back what was received
  self.postMessage('Received: ' + JSON.stringify(e.data));
};