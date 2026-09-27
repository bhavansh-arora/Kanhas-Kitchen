// Applies the saved colour theme before the page paints. Light by default; "auto" follows the device.
(function () {
  var theme = 'light';
  try {
    theme = localStorage.getItem('kk-theme') || 'light';
  } catch (e) {}
  if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
})();
