// public/apps/shared/firma-hseq-helper.js
// Asistente universal de Firma Oficial HSEQ para todas las aplicaciones móviles y módulos del ERP Trans Services A&B

(function () {
  window.asignarFirmaHSEQ = function (padOrCanvas) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      let canvas = null;
      let pad = null;

      if (padOrCanvas) {
        if (padOrCanvas.tagName === "CANVAS") {
          canvas = padOrCanvas;
        } else if (padOrCanvas._canvas) {
          pad = padOrCanvas;
          canvas = padOrCanvas._canvas;
        } else if (padOrCanvas.canvas) {
          pad = padOrCanvas;
          canvas = padOrCanvas.canvas;
        }
      } else if (typeof signaturePad !== "undefined") {
        pad = signaturePad;
        canvas = signaturePad._canvas || signaturePad.canvas;
      } else {
        canvas = document.querySelector("canvas.signature-pad, #signaturePad, #signature-pad");
      }

      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const aspect = img.width / img.height;
        let w = canvas.width * 0.75;
        let h = w / aspect;
        if (h > canvas.height * 0.8) {
          h = canvas.height * 0.8;
          w = h * aspect;
        }
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        ctx.drawImage(img, x, y, w, h);

        if (pad) {
          if (typeof pad.isEmpty === "function") pad.isEmpty = () => false;
          if (pad._data) pad._data = [{}];
        }
        if (typeof window.showToast === "function") {
          window.showToast("Firma oficial HSEQ asignada", "success");
        }
      }
    };
    img.src = "/firma-hseq.png";
  };
})();
