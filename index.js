const RemFSExplorer = (options) => {
  const dom = document.createElement('div');
  dom.classList.add('remfs-explorer');

  const urlParams = new URLSearchParams(window.location.search);

  let rootUrl;

  if (urlParams.has('remfs-root')) {
    rootUrl = urlParams.get('remfs-root');
  }
  else if (options && options.rootUrl) {
    rootUrl = options.rootUrl;
  }

  if (!rootUrl) {
    dom.innerText = "Error: No remfs-root provided";
    return dom;
  }

  let remfsRoot;

  fetch(rootUrl + '/remfs.json')
  .then(response => response.json())
  .then(remfs => {
    remfsRoot = remfs;
    dom.appendChild(Directory(remfsRoot, rootUrl, []));
  });

  dom.addEventListener('change-dir', (e) => {
    let curDir = remfsRoot;
    for (const part of e.detail.path) {
      curDir = curDir.children[part];
    }

    if (curDir.children) {
      const newDirEl = Directory(curDir, rootUrl, e.detail.path)
      dom.replaceChild(newDirEl, dom.childNodes[0]);
    }
    else {
      fetch(rootUrl + encodePath(e.detail.path) + '/remfs.json')
      .then(response => response.json())
      .then(remfs => {
        curDir.children = remfs.children;
        const newDirEl = Directory(curDir, rootUrl, e.detail.path)
        dom.replaceChild(newDirEl, dom.childNodes[0]);
      });
    }
  });

  return dom;
};

const Directory = (dir, rootUrl, path) => {
  const dom = document.createElement('div');
  dom.classList.add('remfs-explorer__directory');

  if (path.length > 0) {
    const parentPath = path.slice();
    parentPath.pop();
    const parentPlaceholder = {
      type: 'dir',
    };
    const upDir = ListItem('..', parentPlaceholder, rootUrl, parentPath);
    dom.appendChild(upDir);
  }

  if (dir.children) {
    for (const filename in dir.children) {
      const child = dir.children[filename];
      const childPath = path.concat(filename);
      const childEl = ListItem(filename, child, rootUrl, childPath)
      dom.appendChild(childEl);

      if (child.type === 'dir') {
        // greedily get all children 1 level down
        if (!child.children) {
          fetch(rootUrl + encodePath(childPath) + '/remfs.json')
          .then(response => response.json())
          .then(remfs => {
            child.children = remfs.children;
          });
        }
      }
    }
  }

  return dom;
};

const ListItem = (filename, item, rootUrl, path) => {
  const dom = document.createElement('a');
  dom.classList.add('remfs-explorer__list-item');
  dom.setAttribute('href', rootUrl + encodePath(path));

  const inner = document.createElement('div');
  inner.classList.add('remfs-explorer__list-content');
  inner.innerText = filename;

  dom.addEventListener('click', (e) => {

    if (item.type === 'dir') {
      e.preventDefault();
      dom.dispatchEvent(new CustomEvent('change-dir', {
        bubbles: true,
        detail: {
          path,
        },
      }));
    }
    else {
      dom.setAttribute('target', '_blank');
    }
  });

  dom.appendChild(inner);

  return dom;
};

function encodePath(parts) {
  return '/' + parts.join('/');
}

function parsePath(pathStr) {
  return pathStr.split('/').slice(1);
}

export {
  RemFSExplorer,
};
