let viewerHandler = null;

export function registerDocumentViewer(handler) {
  viewerHandler = handler;
}

export function showDocumentViewer(payload) {
  if (viewerHandler) {
    viewerHandler(payload);
    return true;
  }
  return false;
}
