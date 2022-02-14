import { encodePath, removeAllChildren, formatBytes } from '../utils.js';
import { Button } from './common.js';

// https://stackoverflow.com/a/38641281/943814
const naturalSorter = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base'
});


const Directory = (state, dir, rootUrl, path, token) => {
  const dom = document.createElement('div');
  dom.classList.add('gemdrive-delver__directory');

  //if (path.length > 0) {
  //  const parentPath = path.slice();
  //  parentPath.pop();
  //  const parentPlaceholder = {
  //    type: 'dir',
  //  };
  //  const listItem = ListItem({}, root, '..', parentPlaceholder, rootUrl, parentPath, token);
  //  const upDir = listItem.dom;
  //  dom.appendChild(upDir);
  //}

  const items = {};

  const observeCallback = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const item = items[entry.target.dataset.filename];
        item.onVisible();
        observer.unobserve(entry.target);
      }
    });
  };

  const observeOptions = {
  };

  const observer = new IntersectionObserver(observeCallback, observeOptions);

  if (dir.children) {
    
    const sortedNames = Object.keys(dir.children).sort(naturalSorter.compare);

    for (const filename of sortedNames) {
      const child = dir.children[filename];

      // TODO: This is a bit of a hack to work around extra '/'s in the path.
      // Might be a cleaner way.
      const itemName = filename.endsWith('/') ? filename.slice(0, -1) : filename;

      const childPath = path.concat(itemName);

      const listItem = ListItem(state.items[filename], filename, child, rootUrl, childPath, token)
      items[filename] = listItem;
      listItem.dom.dataset.filename = filename;
      const childEl = listItem.dom;
      observer.observe(childEl);
      dom.appendChild(childEl);

      //if (child.type === 'dir') {
      //  // greedily get all children 1 level down.
      //  if (!child.children) {
      //    fetch(rootUrl + encodePath(childPath) + '/remfs.json?access_token=' + token)
      //    .then(response => response.json())
      //    .then(remfs => {
      //      child.children = remfs.children;
      //    });
      //  }
      //}
    }
  }

  function onAddChild(name, child) {

    const sortedNames = Object.keys(dir.children).sort(naturalSorter.compare);

    let index = sortedNames.indexOf(name);

    if (index > -1) {
      const childPath = path.concat(name);
      const listItem = ListItem(state.items[name], name, child, rootUrl, childPath, token);
      dom.insertBefore(
        listItem.dom,
        dom.childNodes[index]);
    }
    else {
      throw new Error("Directory DOM insert fail");
    }
  }

  function onRemoveChild(name) {
    const sortedNames = Object.keys(dir.children).sort(naturalSorter.compare);

    let index = sortedNames.indexOf(name);

    if (index > -1) {
      if (path.length > 0) {
        index += 1;
      }
      dom.removeChild(dom.childNodes[index]);
    }
    else {
      throw new Error("Directory DOM removal fail");
    }
  }

  return { dom, onAddChild, onRemoveChild };
};

const ListItem = (state, filename, item, rootUrl, path, token) => {
  //const dom = document.createElement('a');
  const dom = document.createElement('div');
  dom.classList.add('gemdrive-delver__list-item');
  //dom.setAttribute('href', rootUrl + encodePath(path));

  const isDir = filename.endsWith('/');

  let showPreview = false;

  const inner = document.createElement('div');
  inner.classList.add('gemdrive-delver__list-content');
  dom.appendChild(inner);

  const previewEl = document.createElement('div');
  previewEl.classList.add('preview');
  dom.appendChild(previewEl);

  //if (filename !== '..') {
  const checkboxEl = document.createElement('input');
  checkboxEl.classList.add('gemdrive-delver__checkbox');
  checkboxEl.setAttribute('type', 'checkbox');
  checkboxEl.checked = state && state.selected;
  checkboxEl.addEventListener('click', (e) => {

    e.stopPropagation();

    const itemPath = isDir ? encodePath(path) + '/' : encodePath(path);

    if (checkboxEl.checked) {
      dom.dispatchEvent(new CustomEvent('item-selected', {
        bubbles: true,
        detail: {
          driveUri: rootUrl,
          path: itemPath,
          item,
        },
      }));
    }
    else {
      dom.dispatchEvent(new CustomEvent('item-deselected', {
        bubbles: true,
        detail: {
          driveUri: rootUrl,
          path: itemPath,
        },
      }));
    }
  });

  inner.appendChild(checkboxEl);
  //}


  const thumbPlaceholderEl = document.createElement('span');
  thumbPlaceholderEl.classList.add('gemdrive-delver-list-item__thumb-placeholder');
  inner.appendChild(thumbPlaceholderEl);

  let thumbnailPromise;

  const fileData = ItemDataView(filename, item);
  inner.appendChild(fileData.dom);

  dom.addEventListener('click', (e) => {

    if (isDir) {
      e.preventDefault();
      dom.dispatchEvent(new CustomEvent('select-dir', {
        bubbles: true,
        detail: {
          driveUri: rootUrl,
          path,
        },
      }));
    }
    else {
      //e.preventDefault();

      showPreview = !showPreview;

      if (showPreview) {

        const iconRow = IconRow(rootUrl, path, token);
        previewEl.appendChild(iconRow.dom);

        const urlTextEl = document.createElement('a');
        urlTextEl.classList.add('gemdrive-delver-list-item__preview-url');
        const url = rootUrl + encodePath(path);
        urlTextEl.setAttribute('href', url);
        urlTextEl.innerText = url;
        previewEl.appendChild(urlTextEl);


        if (isImage(filename)) {
          previewEl.appendChild(ImagePreview(rootUrl, path, thumbnailPromise, token));
        }
      }
      else {
        removeAllChildren(previewEl);
      }
      //dom.setAttribute('target', '_blank');
    }
  });

  function onVisible() {
    // TODO: why not encode the whole path rather than slicing and adding filename?
    const dirPathStr = encodePath(path.slice(0, -1)) + '/';
    const thumbUrl = rootUrl + '/gemdrive/images/256' + dirPathStr + filename;

    if (isImage(thumbUrl)) {
      const thumbContainerEl = document.createElement('span');
      thumbContainerEl.classList.add('gemdrive-delver__thumb-container');

      const thumbEl = document.createElement('img');
      thumbEl.classList.add('gemdrive-delver__thumb-img');
      thumbContainerEl.appendChild(thumbEl);

      thumbnailPromise = fetch(thumbUrl + '?access_token=' + token)
      .then(response => response.blob());

      thumbnailPromise.then(blob => {
        const url = URL.createObjectURL(blob);
        thumbEl.src = url;
      })

      thumbPlaceholderEl.appendChild(thumbContainerEl);
    }
  }

  return {
    dom,
    onVisible,
  };
};


const ImagePreview = (rootUrl, path, thumbnailPromise, token) => {

  const dom = document.createElement('div');
  dom.classList.add('gemdrive-delver__preview');

  const imageEl = document.createElement('img');
  imageEl.classList.add('gemdrive-delver__preview-image');
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

  const previewUrl = getPreviewUrl(rootUrl, path, dom);

  if (previewUrl) {
    fetch(previewUrl + '?access_token=' + token)
    .then(response => response.blob())
    .then(blob => {
      loaded = true;
      const url = URL.createObjectURL(blob);
      imageEl.src = url;
    })
  }

  return dom;
};

// TODO: Previous version of OpenTabButton
//const OpenTabButton = (rootUrl, path) => {
//  const dom = document.createElement('a');
//  dom.classList.add('gemdrive-delver-icon-button');
//  dom.href = rootUrl + encodePath(path);
//  dom.setAttribute('target', '_blank');
//  const iconEl = document.createElement('ion-icon');
//  iconEl.name = 'open';
//  dom.appendChild(iconEl);
//
//  return dom;
//};



const DownloadButton = (driveUri, path, token) => {
  const dom = document.createElement('span');
  const btnEl = Button("Download");
  dom.appendChild(btnEl);

  dom.addEventListener('click', async (e) => {
    const pathStr = encodePath(path);
    const authenticatedLink = await getAuthenticatedLink(driveUri, pathStr, token);
    window.open(authenticatedLink + '&download=true');
  });

  return dom;
};

//const DownloadButton = (rootUrl, path) => {
//  const dom = document.createElement('a');
//  dom.classList.add('gemdrive-delver-icon-button');
//  dom.href = rootUrl + encodePath(path) + '?download=true';
//  dom.setAttribute('target', '_blank');
//  const iconEl = document.createElement('ion-icon');
//  iconEl.name = 'download';
//  dom.appendChild(iconEl);
//
//  return dom;
//};

const OpenTabButton = (driveUri, path, token) => {
  const dom = document.createElement('span');
  const btnEl = Button("Open in Tab");
  dom.appendChild(btnEl);

  dom.addEventListener('click', async (e) => {
    const pathStr = encodePath(path);

    if (token === '') {
      window.open(driveUri + path);
    }
    else {
      const authenticatedLink = await getAuthenticatedLink(driveUri, pathStr, token);
      window.open(authenticatedLink);
    }
  });

  return dom;
};

async function getAuthenticatedLink(driveUri, pathStr, token) {
  const delegatePath = driveUri + '/gemdrive/create-key';

  const key = {
    privileges: {
      [pathStr]: 'read',
    },
  }

  const response = await fetch(delegatePath + `?access_token=${token}`, {
    method: 'POST',
    body: JSON.stringify(key),
  });

  let link;

  if (response.status) {
    const newToken = await response.text();
    link = driveUri + pathStr + `?access_token=${newToken}`;
  }
  else {
    alert("Error making link");
  }

  return link;
}

const ItemDataView = (filename, item) => {
  const dom = document.createElement('div');
  dom.classList.add('gemdrive-file-data');

  const filenameEl = document.createElement('div');
  filenameEl.classList.add('gemdrive-file-data__filename');
  dom.appendChild(filenameEl);
  filenameEl.innerText = filename;

  const isFile = !filename.endsWith('/');

  if (isFile) {
    const statsEl = document.createElement('div');
    statsEl.classList.add('gemdrive-file-data__stats');
    dom.appendChild(statsEl);
    let statLine = '| ';


    const firstPeriod = filename.indexOf('.');
    if (firstPeriod >= 0) {
      const ext = filename.slice(firstPeriod).toLowerCase();
      statLine += ' ' + ext + ' |';
    }

    if (item.size >= 0) {
      statLine += ' ' + formatBytes(item.size) + ' |';
    }

    if (item.modTime.length > 0) {
      statLine += ' ' + item.modTime + ' |';
    }

    statsEl.innerText = statLine;
  }

  return {
    dom,
  };
};


const IconRow = (rootUrl, path, token) => {
  const dom = document.createElement('div');
  dom.classList.add('gemdrive-icon-row');

  dom.appendChild(DownloadButton(rootUrl, path, token));
  //dom.appendChild(OpenTabButton(rootUrl, path));
  dom.appendChild(OpenTabButton(rootUrl, path, token));
  //dom.appendChild(CreateLinkButton(rootUrl, path, token));

  dom.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  return {
    dom,
  };
};

function getPreviewUrl(rootUrl, path, parentEl) {

  let previewWidth = 512;

  if (window.innerWidth > 512) {
    previewWidth = 1024;
  }

  if (window.innerWidth > 1024) {
    previewWidth = 2048;
  }

  const dirPathStr = encodePath(path.slice(0, -1));
  const filename = path[path.length - 1];
  return `${rootUrl}/gemdrive/images/${previewWidth}${dirPathStr}/${filename}`;
}

function isImage(pathStr) {
  const lower = pathStr.toLowerCase(pathStr);
  return lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png');
}


export {
  Directory,
};
