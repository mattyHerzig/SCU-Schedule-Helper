// inject.js
(function() {
  // This function will be injected into web pages
  function injectExtensionScript() {
    console.log('Chrome extension script successfully injected!');
    
    // Example of adding a visual indicator
    const injectionMarker = document.createElement('div');
    injectionMarker.style.position = 'fixed';
    injectionMarker.style.top = '10px';
    injectionMarker.style.right = '10px';
    injectionMarker.style.backgroundColor = 'green';
    injectionMarker.style.color = 'white';
    injectionMarker.style.padding = '10px';
    injectionMarker.style.zIndex = '9999';
    injectionMarker.textContent = 'Extension Active';
    document.body.appendChild(injectionMarker);

    // Example of modifying page content
    const pageTitle = document.title;
    console.log(`Current page title: ${pageTitle}`);

    // You can add more complex logic here
    // For example, listening for specific events, modifying DOM, etc.
  }

  // Run the injection function
  injectExtensionScript();
})();