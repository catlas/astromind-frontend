// Временна защита срещу вграждане в чужда страница (clickjacking), докато хостингът не праща X-Frame-Options и
// Content-Security-Policy: frame-ancestors 'none' (виж README.md). Не замества заглавията: те остават задължителни.
if (window.top !== window.self) {
  document.documentElement.style.display = 'none';
}
