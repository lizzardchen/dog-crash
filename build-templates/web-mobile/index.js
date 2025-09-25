System.register(["./application.js"], function (_export, _context) {
  "use strict";

  var Application, canvas, $p, bcr, application;
  function topLevelImport(url) {
    return System["import"](url);
  }
  return {
    setters: [function (_applicationJs) {
      Application = _applicationJs.Application;
    }],
    execute: function () {
      canvas = document.getElementById('GameCanvas');
      $p = canvas.parentElement;
      bcr = $p.getBoundingClientRect();
      canvas.width = bcr.width;
      canvas.height = bcr.height;
      application = new Application();
      topLevelImport('cc').then(function (engine) {
        return application.init(engine);
      }).then(function () {
        return application.start();
      }).then(function () {
        // Hide loading background when game is ready
        document.body.classList.add('game-loaded');
        setTimeout(function () {
          var loadingBg = document.getElementById('LoadingBackground');
          if (loadingBg) {
            loadingBg.style.display = 'none';
          }
        }, 20000); // Wait for fade out animation
      })["catch"](function (err) {
        console.error(err);
        // Hide loading background even if there's an error
        document.body.classList.add('game-loaded');
      });
    }
  };
});