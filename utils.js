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

export {
  encodePath,
  parsePath,
  removeAllChildren,
}
