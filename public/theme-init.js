try {
  const theme = localStorage.getItem('anzac-theme') || 'dark';
  document.documentElement.classList.add(theme);
} catch (e) {
  document.documentElement.classList.add('dark');
}

