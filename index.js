// https://stackoverflow.com/a/38641281/943814
const naturalSorter = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base'
});

const RemFSDelver = async (options) => {
  const dom = document.createElement('div');
  dom.classList.add('remfs-delver');

  const urlParams = new URLSearchParams(window.location.search);

  const previewDirName = 'previews';

  let curDir;
  let curPath;
  let remfsRoot;
  let layout = 'list';
  // TODO: don't really like having this be a global
  let onAddChild = null;

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

  const controlBar = ControlBar();
  dom.appendChild(controlBar.dom);


  // File uploads
  const uppie = new Uppie();

  const handleFiles = async (e, formData, filenames) => {
    for (const param of formData.entries()) {
      const file = param[1];

      console.log(file);

      const uploadPath = [...curPath, file.name];
      console.log(uploadPath);

      fetch(rootUrl + encodePath(uploadPath), {
        method: 'PUT',
        headers: {
          'Remfs-Token': localStorage.getItem('remfs-token'),
        },
        body: file,
      })
      .then(response => response.json())
      .then(remfs => {

        // TODO: have backend return just the new item, not the parent dir?

        const currentItem = curDir.children[file.name];
        curDir.children[file.name] = remfs.children[file.name];

        if (!currentItem) {
          // New item; update dom
          onAddChild(file.name, remfs.children[file.name]);
        }
      })
      .catch(e => {
        console.error(e);
      });
    }
  };

  const fileInput = InvisibleFileInput();
  uppie(fileInput, handleFiles);
  dom.appendChild(fileInput);
  
  const folderInput = InvisibleFolderInput();
  uppie(folderInput, handleFiles);
  dom.appendChild(folderInput);

  controlBar.dom.addEventListener('upload', (e) => {
    fileInput.click();
  });

  
  render();

  async function render() {

    const remfsResponse = await fetch(rootUrl + '/remfs.json', {
      headers: {
        'Remfs-Token': localStorage.getItem('remfs-token'),
      },
    })

    console.log(remfsResponse);

    if (remfsResponse.status === 200) {
      remfsRoot = await remfsResponse.json();
      curDir = remfsRoot;
      curPath = [];

      const dirContainer = document.createElement('div');
      dirContainer.classList.add('remfs-delver__dir-container');
      dom.appendChild(dirContainer);

      const dir = Directory(remfsRoot, curDir, rootUrl, curPath, layout);
      onAddChild = dir.onAddChild;
      dirContainer.appendChild(dir.dom);

      dirContainer.addEventListener('change-dir', (e) => {
        curDir = remfsRoot;
        curPath = e.detail.path;
        controlBar.onPathChange(curPath);
        for (const part of curPath) {
          curDir = curDir.children[part];
        }

        if (curDir.children) {
          updateDirEl();
        }
        else {
          fetch(rootUrl + encodePath(curPath) + '/remfs.json')
          .then(response => response.json())
          .then(remfs => {
            curDir.children = remfs.children;
            updateDirEl();
          });
        }
      });

      function updateDirEl() {
        const newDir = Directory(remfsRoot, curDir, rootUrl, curPath, layout)
        onAddChild = newDir.onAddChild;
        dirContainer.replaceChild(newDir.dom, dirContainer.childNodes[0]);
      }
    }
    else if (remfsResponse.status === 403) {
      const loginEl = LoginView(rootUrl);
      loginEl.addEventListener('authenticated', (e) => {
        console.log(e.detail);
        localStorage.setItem('remfs-token', e.detail.token);
        location.reload();
      });
      dom.appendChild(loginEl);
    }
  }

  return dom;
};

const ControlBar = () => {
  const dom = document.createElement('div');
  dom.classList.add('remfs-delver-control-bar');

  const curPathEl = document.createElement('span');
  curPathEl.innerText = "/";
  dom.appendChild(curPathEl);

  const btnContainerEl = document.createElement('span');
  btnContainerEl.classList.add('remfs-delver-control-bar__buttons');
  dom.appendChild(btnContainerEl);

  const uploadBtnEl = document.createElement('ion-icon');
  uploadBtnEl.name = 'cloud-upload';
  uploadBtnEl.addEventListener('click', (e) => {
    dom.dispatchEvent(new CustomEvent('upload', {
      bubbles: true,
    }));
  });
  btnContainerEl.appendChild(uploadBtnEl);

  function onPathChange(path) {
    const pathStr = encodePath(path);
    curPathEl.innerText = pathStr;
  }

  //const listIconEl = document.createElement('ion-icon');
  //listIconEl.name = 'list';
  //listIconEl.addEventListener('click', (e) => {
  //  dom.dispatchEvent(new CustomEvent('layout-list', {
  //    bubbles: true,
  //  }));
  //});
  //dom.appendChild(listIconEl);
  //
  //const gridIconEl = document.createElement('ion-icon');
  //gridIconEl.name = 'apps';
  //gridIconEl.addEventListener('click', (e) => {
  //  dom.dispatchEvent(new CustomEvent('layout-grid', {
  //    bubbles: true,
  //  }));
  //});
  //dom.appendChild(gridIconEl);

  return { dom, onPathChange };
};

const LoginView = (rootUrl) => {
  const dom = document.createElement('div');
  dom.classList.add('remfs-delver__login');

  render();

  function render() {

    removeAllChildren(dom);

    const headerEl = document.createElement('h1');
    headerEl.innerText = "Login";
    dom.appendChild(headerEl);

    const emailLabelEl = document.createElement('div');
    emailLabelEl.innerText = "Email:";
    dom.appendChild(emailLabelEl);

    const emailEl = document.createElement('input');
    emailEl.type = 'text';
    dom.appendChild(emailEl);

    const submitEl = document.createElement('button');
    submitEl.innerText = 'Submit';
    submitEl.addEventListener('click', (e) => {

      dom.innerHTML = '<h1>Check your email to confirm login</h1>';

      fetch(rootUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'authenticate',
          params: {
            email: emailEl.value,
          }
        }),
      })
      .then(response => {
        console.log(response);
        if (response.status !== 200) {
          throw new Error("Authentication failed");
        }

        return response.text();
      })
      .then(token => {
        dom.dispatchEvent(new CustomEvent('authenticated', {
          bubbles: true,
          detail: {
            token,
          },
        }));
      })
      .catch(e => {
        console.error(e);
        alert("Login failed. Please try again");
        render();
      });
    });
    dom.appendChild(submitEl);
  }

  return dom;
};


function genSortedItems(data) {
  return Object.keys(data)
    .sort(naturalSorter.compare)
    .map(name => ({
      name,
      state: makeItemState(),
    }));
}

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

    console.log(name, child);

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

  thumbnailPromise.then((blob) => {
    if (!loaded) {
      const url = URL.createObjectURL(blob);
      imageEl.src = url;
    }
  });

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

const InvisibleFileInput = () => {
  const fileInput = document.createElement('input');
  fileInput.classList.add('upload-button__input');
  fileInput.setAttribute('type', 'file');
  fileInput.setAttribute('multiple', true);
  return fileInput;
};


const InvisibleFolderInput = () => {
  const folderInput = document.createElement('input');
  folderInput.classList.add('upload-button__input');
  folderInput.setAttribute('type', 'file');
  folderInput.setAttribute('directory', true);
  folderInput.setAttribute('webkitdirectory', true);
  folderInput.setAttribute('mozdirectory', true);
  return folderInput;
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

function encodePath(parts) {
  return '/' + parts.join('/');
}

function parsePath(pathStr) {
  return pathStr.split('/').slice(1);
}

function isImage(pathStr) {
  const lower = pathStr.toLowerCase(pathStr);
  return lower.endsWith('.jpg') || lower.endsWith('.jpeg');
}

function removeAllChildren(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

export {
  RemFSDelver,
};
