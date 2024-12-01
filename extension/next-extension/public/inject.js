// inject.js

// Create a new div element to display the message
const messageDiv = document.createElement('div');

// Apply some styling to the div
messageDiv.style.position = 'fixed';
messageDiv.style.top = '20px';
messageDiv.style.right = '20px';
messageDiv.style.padding = '10px';
messageDiv.style.backgroundColor = '#4CAF50';
messageDiv.style.color = 'white';
messageDiv.style.fontSize = '16px';
messageDiv.style.borderRadius = '5px';
messageDiv.style.zIndex = '9999';
messageDiv.innerHTML = 'Hello World';

// Append the message div to the body of the page
document.body.appendChild(messageDiv);