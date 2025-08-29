// Safe export utility - exposes functions to window.App namespace for testing
(function(root) {
  if (typeof root.App === 'undefined') {
    root.App = {};
  }
  if (typeof root.App.calc === 'undefined') {
    root.App.calc = {};
  }
  if (typeof root.App.state === 'undefined') {
    root.App.state = {};
  }
})(typeof window !== 'undefined' ? window : globalThis);