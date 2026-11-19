(function () {
  'use strict';
  var params = new URLSearchParams(window.location.search);
  if (params.get('embedded') !== '1' || window.parent === window) return;
  var channel = 'writegrow:cce:v1', token = params.get('bridge');
  var values = {}, boot, initialized = false;
  function send(type, payload) {
    window.parent.postMessage(Object.assign({ channel: channel, token: token, type: type }, payload), window.location.origin);
  }
  function changed() {
    if (!initialized) return;
    send('change', { state: { grade: Number(values.cce_grade), progress: JSON.parse(values.cce_progress || '[]') } });
  }
  window.writegrowGameStorage = {
    getItem: function (key) { return values[key] || null; },
    setItem: function (key, value) { if (key !== 'cce_grade' && key !== 'cce_progress') return; values[key] = String(value); changed(); },
    removeItem: function (key) { delete values[key]; changed(); }
  };
  window.writegrowGameBoot = function (callback) { boot = callback; send('ready'); };
  window.writegrowGameScroll = function () { send('scroll'); };
  window.addEventListener('message', function (event) {
    var msg = event.data;
    if (event.source !== window.parent || event.origin !== window.location.origin || !msg || msg.channel !== channel || msg.token !== token || msg.type !== 'init' || initialized) return;
    if (!boot || !msg.state || !Array.isArray(msg.state.progress) || !Number.isInteger(msg.state.grade) || msg.state.grade < 3 || msg.state.grade > 8) return;
    values.cce_grade = String(msg.state.grade);
    values.cce_progress = JSON.stringify(msg.state.progress.slice(-80));
    initialized = true;
    boot({ screen: 'intro', grade: msg.state.grade, gradeSet: true, home: true });
    // Keep the game in control of rendering; only report its natural document height.
    var lastHeight = 0;
    new ResizeObserver(function () {
      var app = document.getElementById('app');
      var height = Math.ceil(app.getBoundingClientRect().height);
      if (height !== lastHeight) { lastHeight = height; send('height', { height: height }); }
    }).observe(document.getElementById('app'));
    document.addEventListener('click', function (e) {
      if (e.target.closest('#back,#again')) send('scroll');
    });
    // The integrated history belongs to this student, not to the whole browser.
    new MutationObserver(function () {
      document.querySelectorAll('h4').forEach(function (h) { if (h.textContent === 'Progress on this device') h.textContent = 'Game progress'; });
    }).observe(document.getElementById('app'), { childList: true, subtree: true });
  });
})();
