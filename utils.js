function encodePath(parts) {
  return '/' + parts.join('/');
}

function parsePath(pathStr) {
  if (pathStr === '/') {
    return [];
  }
  return pathStr.split('/').slice(1);
}

function removeAllChildren(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function formatBytes(bytes) {
  if (bytes > 1000000000) {
    return (bytes / 1000000000).toFixed(2) + 'GB';
  }
  else if (bytes > 1000000) {
    return Math.round(bytes / 1000000).toString() + 'MB';
  }
  else if (bytes > 1000) {
    return Math.round(bytes / 1000).toString() + 'KB';
  }
  else {
    return bytes.toString() + " bytes";
  }
}

export {
  encodePath,
  parsePath,
  removeAllChildren,
  formatBytes,
}
