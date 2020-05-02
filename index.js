import { parsePath, encodePath, removeAllChildren } from './utils.js';
import { Directory } from './components/directory.js';


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
  let onRemoveChild = null;
  let selectedItems = {};

  let rootUri;
  if (urlParams.has('remfs')) {
    rootUri = urlParams.get('remfs');
  }
  else if (options && options.rootUri) {
    rootUri = options.rootUri;
  }

  if (!rootUri) {
    dom.innerText = "Error: No remFS URI provided (remfs=<remfs-uri> parameter)";
    return dom;
  }

  let rootUrl = rootUri;
  if (!rootUrl.startsWith('http')) {
    const proto = options && options.secure ? 'https://' : 'http://';
    rootUrl = proto + rootUrl;
  }

  const rootUrlObj = new URL(rootUrl);

  history.pushState(null, '', window.location.pathname + '?remfs=' + rootUri);

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

        const currentItem = curDir.children[file.name];
        curDir.children[file.name] = remfs;

        if (!currentItem) {
          // New item; update dom
          onAddChild(file.name, remfs);
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

  const rootPath = new URL(rootUrl).pathname;

  controlBar.dom.addEventListener('delete', (e) => {
    const numItems = Object.keys(selectedItems).length;

    const doIt = confirm(`Are you sure you want to delete ${numItems} items?`);
    
    if (doIt) {
      for (const pathStr in selectedItems) {

        const path = parsePath(pathStr);
        const filename = path[path.length - 1];

        fetch(rootUrl + pathStr + '?access_token=' + localStorage.getItem('remfs-token'), {
          method: 'DELETE',
        })
        .then(() => {
          onRemoveChild(filename);
          delete curDir.children[filename];
          selectedItems = {};
          controlBar.onSelectedItemsChange(selectedItems);
        })
        .catch((e) => {
          console.error(e);
        });
      }
    }
  });

  
  render();

  async function render() {

    if (urlParams.has('code')) {
      const code = urlParams.get('code');
      urlParams.delete('code');

      const accessToken = await fetch(rootUrl + '?pauth-method=token&auth-code=' + code).then(r => r.text());
      localStorage.setItem('remfs-token', accessToken);
    }

    const remfsResponse = await fetch(rootUrl + '/remfs.json?access_token=' + localStorage.getItem('remfs-token'))

    if (remfsResponse.status === 200) {
      await maintainInsecureToken(rootUrl, localStorage.getItem('remfs-token'));

      remfsRoot = await remfsResponse.json();
      curDir = remfsRoot;
      curPath = [];

      const dirContainer = document.createElement('div');
      dirContainer.classList.add('remfs-delver__dir-container');
      dom.appendChild(dirContainer);

      const dir = Directory(remfsRoot, curDir, rootUrl, curPath, layout);
      onAddChild = dir.onAddChild;
      onRemoveChild = dir.onRemoveChild;
      dirContainer.appendChild(dir.dom);

      dirContainer.addEventListener('change-dir', (e) => {
        selectedItems = {};
        controlBar.onSelectedItemsChange(selectedItems);
        curDir = remfsRoot;
        curPath = e.detail.path;
        controlBar.onPathChange(curPath);
        for (const part of curPath) {
          curDir = curDir.children[part];
        }

        history.pushState(null, '', window.location.pathname + '?remfs=' + rootUri + encodePath(curPath));

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

      dirContainer.addEventListener('item-selected', (e) => {
        selectedItems[encodePath(e.detail.path)] = true;
        controlBar.onSelectedItemsChange(selectedItems);
      });
      dirContainer.addEventListener('item-deselected', (e) => {
        delete selectedItems[encodePath(e.detail.path)];
        controlBar.onSelectedItemsChange(selectedItems);
      });

      function updateDirEl() {
        const newDir = Directory(remfsRoot, curDir, rootUrl, curPath, layout)
        onAddChild = newDir.onAddChild;
        onRemoveChild = newDir.onRemoveChild;
        dirContainer.replaceChild(newDir.dom, dirContainer.childNodes[0]);
      }
    }
    else if (remfsResponse.status === 403) {
      console.log(rootUrl);

      const clientId = window.location.origin;
      const redirectUri = window.location.href;
      const scope = '/:write';
      window.location.href = rootUrl + `?pauth-method=authorize&response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
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

  const deleteBtnContainerEl = document.createElement('span');
  btnContainerEl.appendChild(deleteBtnContainerEl);

  const deleteBtnEl = document.createElement('ion-icon');
  deleteBtnEl.name = 'close-circle';
  deleteBtnEl.addEventListener('click', (e) => {
    dom.dispatchEvent(new CustomEvent('delete', {
      bubbles: true,
    }));
  });

  function onPathChange(path) {
    const pathStr = encodePath(path);
    curPathEl.innerText = pathStr;
  }

  function onSelectedItemsChange(selectedItems) {
    if (Object.keys(selectedItems).length === 0) {
      removeAllChildren(deleteBtnContainerEl);
    }
    else if (deleteBtnContainerEl.childNodes.length === 0) {
      deleteBtnContainerEl.appendChild(deleteBtnEl);
    }
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

  return { dom, onPathChange, onSelectedItemsChange };
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

// uses a long-lived token to regularly refresh a global short-lived, read-only
// token. This is useful for things like setting image src URLs for protected
// images.
async function maintainInsecureToken(rootUrl, secureToken) {

  async function refreshToken() {
    return fetch(rootUrl + '?pauth-method=dummy&access_token=' + secureToken, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'authorize',
        params: {
          maxAge: 600,
          perms: {
            '/': {
              read: true,
            }
          }
        },
      }),
    })
    .then(response => {
      if (response.status !== 200) {
        alert("failed to refresh token");
      }

      return response.text();
    })
    .then(token => {
      // Create a temporary link which includes a token, click that link, then
      // remove it.
      window.insecureToken = token;

      return token;
    });
  }

  await refreshToken();

  // refresh every 9 minutes. Valid for 10 minutes
  setInterval(async () => {
    await refreshToken();  
  }, 540000);
}


export {
  RemFSDelver,
};
