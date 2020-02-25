import { encodePath, removeAllChildren } from '../utils.js';

// https://stackoverflow.com/a/38641281/943814
const naturalSorter = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base'
});


const Directory = (root, dir, rootUrl, path, layout) => {
  const dom = document.createElement('div');
  dom.classList.add('remfs-delver__directory');

  if (path.length > 0) {
    const parentPath = path.slice();
    parentPath.pop();
    const parentPlaceholder = {
      type: 'dir',
    };
    const upDir = ListItem(root, '..', parentPlaceholder, rootUrl, parentPath);
    dom.appendChild(upDir);
  }

  if (dir.children) {
    
    const sortedNames = Object.keys(dir.children).sort(naturalSorter.compare);

    for (const filename of sortedNames) {
      const child = dir.children[filename];
      const childPath = path.concat(filename);
      const childEl = ListItem(root, filename, child, rootUrl, childPath)
      dom.appendChild(childEl);

      if (child.type === 'dir') {
        // greedily get all children 1 level down.
        if (!child.children) {
          fetch(rootUrl + encodePath(childPath) + '/remfs.json', {
            headers: {
              'Remfs-Token': localStorage.getItem('remfs-token'),
            },
          })
          .then(response => response.json())
          .then(remfs => {
            child.children = remfs.children;
          });
        }
      }
    }
  }

  function onAddChild(name, child) {

    const sortedNames = Object.keys(dir.children).sort(naturalSorter.compare);

    let index = sortedNames.indexOf(name);

    if (index > -1) {
      const childPath = path.concat(name);
      dom.insertBefore(
        ListItem(root, name, child, rootUrl, childPath),
        dom.childNodes[index]);
    }
    else {
      throw new Error("Directory DOM insert fail");
    }
  }

  return { dom, onAddChild };
};

const ListItem = (root, filename, item, rootUrl, path) => {
  //const dom = document.createElement('a');
  const dom = document.createElement('div');
  dom.classList.add('remfs-delver__list-item');
  //dom.setAttribute('href', rootUrl + encodePath(path));

  let showPreview = false;

  const inner = document.createElement('div');
  inner.classList.add('remfs-delver__list-content');
  dom.appendChild(inner);

  const previewEl = document.createElement('div');
  previewEl.classList.add('preview');
  dom.appendChild(previewEl);

  let thumbnailPromise;

  if (item.type === 'dir') {
    const iconEl = document.createElement('ion-icon');
    iconEl.name = 'folder';
    inner.appendChild(iconEl);
  }
  else {

    const thumbUrl = getThumbUrl(root, rootUrl, path);

    if (thumbUrl) {
      const thumbEl = document.createElement('img');
      thumbEl.classList.add('remfs-delver__thumb');

      thumbnailPromise = fetch(thumbUrl, {
        method: 'POST',
        headers: {
          //'Remfs-Token': localStorage.getItem('remfs-token'),
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'read',
          params: {
            'remfs-token': localStorage.getItem('remfs-token'),
          },
        }),
      })
      .then(response => response.blob())

      thumbnailPromise.then(blob => {
        const url = URL.createObjectURL(blob);
        thumbEl.src = url;
      })

      inner.appendChild(thumbEl);
    }
    else {
      const iconEl = document.createElement('ion-icon');
      iconEl.name = 'document';
      inner.appendChild(iconEl);
    }
  }

  const filenameEl = document.createElement('span');
  filenameEl.classList.add('remfs-delver__list-item-filename');
  filenameEl.innerText = filename;
  inner.appendChild(filenameEl);


  const itemControlsEl = document.createElement('span');
  itemControlsEl.classList.add('remfs-delver-item__controls');
  inner.appendChild(itemControlsEl);

  if (item.type === 'file') {
    itemControlsEl.appendChild(OpenExternalButton(rootUrl, path));
  }

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
      //e.preventDefault();

      showPreview = !showPreview;

      if (showPreview) {
        previewEl.appendChild(ImagePreview(root, rootUrl, path, thumbnailPromise));
      }
      else {
        removeAllChildren(previewEl);
      }
      //dom.setAttribute('target', '_blank');
    }
  });

  return dom;
};


const ImagePreview = (root, rootUrl, path, thumbnailPromise) => {

  const dom = document.createElement('div');
  dom.classList.add('remfs-delver__preview');

  const imageEl = document.createElement('img');
  imageEl.classList.add('remfs-delver__preview-image');
  dom.appendChild(imageEl);

  let loaded = false;

  if (thumbnailPromise) {
    thumbnailPromise.then((blob) => {
      if (!loaded) {
        const url = URL.createObjectURL(blob);
        imageEl.src = url;
      }
    });
  }

  const previewUrl = getPreviewUrl(root, rootUrl, path);

  if (previewUrl) {
    //const blob = await fetch(rootUrl + '/thumbnails' + encodePath(path), {
    fetch(previewUrl, {
      method: 'POST',
      headers: {
        //'Remfs-Token': localStorage.getItem('remfs-token'),
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'read',
        params: {
          'remfs-token': localStorage.getItem('remfs-token'),
        },
      }),
    })
    .then(response => response.blob())
    .then(blob => {
      loaded = true;
      const url = URL.createObjectURL(blob);
      imageEl.src = url;
    })
  }

  return dom;
};


const OpenExternalButton = (rootUrl, path) => {
  const dom = document.createElement('a');
  dom.classList.add('remfs-delver-open-external-button');
  dom.href = rootUrl + encodePath(path);
  dom.setAttribute('target', '_blank');
  const iconEl = document.createElement('ion-icon');
  iconEl.name = 'open';
  dom.appendChild(iconEl);

  dom.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  return dom;
};


function getThumbUrl(root, rootUrl, path) {
  return getFileUrl(root, rootUrl, 'thumbnails', path);
}

function getPreviewUrl(root, rootUrl, path) {
  return getFileUrl(root, rootUrl, 'previews', path);
}

function getFileUrl(root, rootUrl, type, path) {
  const filename = path[path.length - 1];
  if (isImage(filename) && root.children[type]) {
    let curItem = root.children[type];

    for (const part of path) {
      if (curItem.children) {
        curItem = curItem.children[part];
      }
      else {
        console.log("file not found");
        break;
      }
    }

    if (curItem) {
      const url = rootUrl + '/' + type + encodePath(path);
      return url;
    }
  }

  return null;
}


function isImage(pathStr) {
  const lower = pathStr.toLowerCase(pathStr);
  return lower.endsWith('.jpg') || lower.endsWith('.jpeg');
}


export {
  Directory,
};
