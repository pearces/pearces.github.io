var url = "./Resume.pdf";
var { pdfjsLib } = globalThis;

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "/scripts/pdfjs-dist/build/pdf.worker.mjs";

var pdfDoc = null,
  pageNum = 1,
  pageRendering = false,
  pageNumPending = null,
  scale = 1.5,
  canvas = document.getElementById("container"),
  ctx = canvas.getContext("2d");

/**
 * Get page info from document, resize canvas accordingly, and render page.
 * @param num Page number.
 */
function renderPage(num) {
  pageRendering = true;
  // Using promise to fetch the page
  pdfDoc.getPage(num).then(function (page) {
    var viewport = page.getViewport({ scale: scale });
    // Support HiDPI-screens.
    var outputScale = window.devicePixelRatio || 1;

    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = Math.floor(viewport.width) + "px";
    canvas.style.height = Math.floor(viewport.height) + "px";

    var transform =
      outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

    // Render PDF page into canvas context
    var renderContext = {
      canvasContext: ctx,
      transform: transform,
      viewport: viewport,
    };
    var renderTask = page.render(renderContext);

    // Wait for rendering to finish
    renderTask.promise.then(function () {
      pageRendering = false;
      if (pageNumPending !== null) {
        // New page rendering is pending
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    });
  });

  // Update page counters
  document.getElementById("page_num").textContent = num;
}

/**
 * If another page rendering in progress, waits until the rendering is
 * finished. Otherwise, executes rendering immediately.
 */
function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

/** Displays previous page */
function onPrevPage() {
  if (pageNum <= 1) {
    return;
  }
  pageNum--;
  queueRenderPage(pageNum);
}
document.getElementById("prev").addEventListener("click", onPrevPage);

/** Displays next page */
function onNextPage() {
  if (pageNum >= pdfDoc.numPages) {
    return;
  }
  pageNum++;
  queueRenderPage(pageNum);
}
document.getElementById("next").addEventListener("click", onNextPage);

/** Zoom in */
function onZoomIn() {
  if (scale >= 2) {
    return;
  }
  scale += 0.1;
  queueRenderPage(pageNum);
}
document.getElementById("zoomIn").addEventListener("click", onZoomIn);

/** Zoom out */
function onZoomOut() {
  if (scale <= 0.5) {
    return;
  }
  scale -= 0.1;
  queueRenderPage(pageNum);
}
document.getElementById("zoomOut").addEventListener("click", onZoomOut);

/** Download PDF */
function onDownload() {
  pdfDoc.getData().then(function (data) {
    var blob = new Blob([data], { type: "application/pdf" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "resume.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}
document.getElementById("download").addEventListener("click", onDownload);

/** Asynchronously downloads PDF */
var loadingTask = pdfjsLib.getDocument(url);
pdfDoc = await loadingTask.promise;
document.getElementById("page_count").textContent = pdfDoc.numPages;

// Initial/first page rendering
renderPage(pageNum);
