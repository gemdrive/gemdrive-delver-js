import { parsePath, encodePath, removeAllChildren } from './utils.js';
import { ControlBar } from './components/control_bar.js';
import { FilesystemList } from './components/filesystem_list.js';
import { Directory } from './components/directory.js';


const RemFSDelver = async (options) => {
  const dom = document.createElement('div');
  dom.classList.add('remfs-delver');

  const controlBar = ControlBar();
  dom.appendChild(controlBar.dom);

  const pageEl = document.createElement('div');
  pageEl.classList.add('remfs-delver__dir-container');
  dom.appendChild(pageEl);

  let settings = JSON.parse(localStorage.getItem('settings'));

  if (settings === null) {
    settings = {
      filesystems: {},
    };
    localStorage.setItem('settings', JSON.stringify(settings));
  }

  const fsList = FilesystemList(settings.filesystems);
  pageEl.appendChild(fsList.dom);

  pageEl.addEventListener('add-filesystem', async (e) => {

    const remfsUrl = await validateUrl(e.detail.url, settings);
    
    if (remfsUrl) {
      const filesystem = {};
      settings.filesystems[remfsUrl] = filesystem;
      localStorage.setItem('settings', JSON.stringify(settings));

      fsList.addFilesystem(remfsUrl, filesystem);
    }
  });

  controlBar.dom.addEventListener('go-to-your-home', (e) => {
    removeAllChildren(pageEl);
    const fsList = FilesystemList(settings.filesystems);
    pageEl.appendChild(fsList.dom);
    controlBar.onLocationChange('', []);
    curFsUrl = null;
    curPath = null;
  });

  pageEl.addEventListener('select-filesystem', async (e) => {
    const fsUrl = e.detail.url;
    await navigate(fsUrl, []);
  });

  pageEl.addEventListener('select-dir', async (e) => {
    await navigate(e.detail.fsUrl, e.detail.path);
  });

  let curFsUrl;
  let curPath;
  async function navigate(fsUrl, path) {

    curFsUrl = fsUrl;
    curPath = path;

    const fs = settings.filesystems[fsUrl];
    const token = localStorage.getItem('access_token');
    const remfsPath = [...path, 'remfs.json'];
    const reqUrl = fsUrl + encodePath(remfsPath) + '?access_token=' + token;
    const remfsResponse = await fetch(reqUrl)

    if (remfsResponse.status === 200) {
      const remfsRoot = await remfsResponse.json();
      const curDir = remfsRoot;
      const dir = Directory(remfsRoot, curDir, fsUrl, path, null, token);
      removeAllChildren(pageEl);
      pageEl.appendChild(dir.dom);
      controlBar.onLocationChange(fsUrl, path);
    }
    else if (remfsResponse.status === 403) {
      alert("Unauthorized");
    }
  }

  // File uploads
  const uppie = new Uppie();

  const handleFiles = async (e, formData, filenames) => {
    for (const param of formData.entries()) {
      const file = param[1];

      const uploadPath = [...curPath, file.name];
      const uploadUrl = curFsUrl + encodePath(uploadPath);
      console.log(uploadUrl);

      fetch(uploadUrl + '?access_token=' + localStorage.getItem('access_token'), {
        method: 'PUT',
        body: file,
      })
      .then(response => response.json())
      .then(remfs => {
        // TODO: This is a hack. Will probably need to dynamically update
        // at some point.
        navigate(curFsUrl, curPath);
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
    if (curFsUrl) {
      fileInput.click();
    }
  });

  return dom;




  //const urlParams = new URLSearchParams(window.location.search);

  //const previewDirName = 'previews';

  //let curDir;
  //let curPath;
  //let remfsRoot;
  //let layout = 'list';
  //// TODO: don't really like having this be a global
  //let onAddChild = null;
  //let onRemoveChild = null;
  //let selectedItems = {};

  //if (urlParams.has('error')) {
  //  alert("Authorization error. You probably don't have permission to view this path");
  //  return;
  //}

  //let rootUri;
  //if (urlParams.has('remfs')) {
  //  rootUri = urlParams.get('remfs');
  //}
  //else if (options && options.rootUri) {
  //  rootUri = options.rootUri;
  //}

  //if (!rootUri) {
  //  dom.innerText = "Error: No remFS URI provided (remfs=<remfs-uri> parameter)";
  //  return dom;
  //}

  //let rootUrl = rootUri;
  //if (!rootUrl.startsWith('http')) {
  //  const proto = options && options.secure ? 'https://' : 'http://';
  //  rootUrl = proto + rootUrl;
  //}

  //history.pushState(null, '', window.location.pathname + '?remfs=' + rootUri);

  //const controlBar = ControlBar();
  //dom.appendChild(controlBar.dom);


  //// File uploads
  //const uppie = new Uppie();

  //const handleFiles = async (e, formData, filenames) => {
  //  for (const param of formData.entries()) {
  //    const file = param[1];

  //    console.log(file);

  //    const uploadPath = [...curPath, file.name];
  //    console.log(uploadPath);

  //    fetch(rootUrl + encodePath(uploadPath) + '?access_token=' + localStorage.getItem('access_token'), {
  //      method: 'PUT',
  //      body: file,
  //    })
  //    .then(response => response.json())
  //    .then(remfs => {

  //      const currentItem = curDir.children[file.name];
  //      curDir.children[file.name] = remfs;

  //      if (!currentItem) {
  //        // New item; update dom
  //        onAddChild(file.name, remfs);
  //      }
  //    })
  //    .catch(e => {
  //      console.error(e);
  //    });
  //  }
  //};

  //const fileInput = InvisibleFileInput();
  //uppie(fileInput, handleFiles);
  //dom.appendChild(fileInput);
  //
  //const folderInput = InvisibleFolderInput();
  //uppie(folderInput, handleFiles);
  //dom.appendChild(folderInput);

  //controlBar.dom.addEventListener('upload', (e) => {
  //  fileInput.click();
  //});

  //const rootPath = new URL(rootUrl).pathname;

  //controlBar.dom.addEventListener('delete', (e) => {
  //  const numItems = Object.keys(selectedItems).length;

  //  const doIt = confirm(`Are you sure you want to delete ${numItems} items?`);
  //  
  //  if (doIt) {
  //    for (const pathStr in selectedItems) {

  //      const path = parsePath(pathStr);
  //      const filename = path[path.length - 1];

  //      fetch(rootUrl + pathStr + '?access_token=' + localStorage.getItem('access_token'), {
  //        method: 'DELETE',
  //      })
  //      .then(() => {
  //        onRemoveChild(filename);
  //        delete curDir.children[filename];
  //        selectedItems = {};
  //        controlBar.onSelectedItemsChange(selectedItems);
  //      })
  //      .catch((e) => {
  //        console.error(e);
  //      });
  //    }
  //  }
  //});

  //
  //render();

  //async function render() {

  //  if (urlParams.has('code')) {
  //    const code = urlParams.get('code');
  //    urlParams.delete('code');

  //    const accessToken = await fetch(rootUrl + '?pauth-method=token&grant_type=authorization_code&code=' + code).then(r => r.text());
  //    localStorage.setItem('access_token', accessToken);
  //  }

  //  const remfsResponse = await fetch(rootUrl + '/remfs.json?access_token=' + localStorage.getItem('access_token'))

  //  if (remfsResponse.status === 200) {
  //    //await maintainInsecureToken(rootUrl, localStorage.getItem('access_token'));

  //    remfsRoot = await remfsResponse.json();
  //    curDir = remfsRoot;
  //    curPath = [];

  //    const dirContainer = document.createElement('div');
  //    dirContainer.classList.add('remfs-delver__dir-container');
  //    dom.appendChild(dirContainer);

  //    const dir = Directory(remfsRoot, curDir, rootUrl, curPath, layout, localStorage.getItem('access_token'));
  //    onAddChild = dir.onAddChild;
  //    onRemoveChild = dir.onRemoveChild;
  //    dirContainer.appendChild(dir.dom);

  //    dirContainer.addEventListener('change-dir', (e) => {
  //      selectedItems = {};
  //      controlBar.onSelectedItemsChange(selectedItems);
  //      curDir = remfsRoot;
  //      curPath = e.detail.path;
  //      controlBar.onPathChange(curPath);
  //      for (const part of curPath) {
  //        curDir = curDir.children[part];
  //      }

  //      history.pushState(null, '', window.location.pathname + '?remfs=' + rootUri + encodePath(curPath));

  //      if (curDir.children) {
  //        updateDirEl();
  //      }
  //      else {
  //        fetch(rootUrl + encodePath(curPath) + '/remfs.json')
  //        .then(response => response.json())
  //        .then(remfs => {
  //          curDir.children = remfs.children;
  //          updateDirEl();
  //        });
  //      }
  //    });

  //    dirContainer.addEventListener('item-selected', (e) => {
  //      selectedItems[encodePath(e.detail.path)] = true;
  //      controlBar.onSelectedItemsChange(selectedItems);
  //    });
  //    dirContainer.addEventListener('item-deselected', (e) => {
  //      delete selectedItems[encodePath(e.detail.path)];
  //      controlBar.onSelectedItemsChange(selectedItems);
  //    });

  //    function updateDirEl() {
  //      const newDir = Directory(remfsRoot, curDir, rootUrl, curPath, layout, localStorage.getItem('access_token'))
  //      onAddChild = newDir.onAddChild;
  //      onRemoveChild = newDir.onRemoveChild;
  //      dirContainer.replaceChild(newDir.dom, dirContainer.childNodes[0]);
  //    }
  //  }
  //  else if (remfsResponse.status === 403) {
  //    const clientId = window.location.origin;
  //    const redirectUri = window.location.href;
  //    const scope = rootPath + ':write';
  //    window.location.href = rootUrl + `?pauth-method=authorize&response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  //  }
  //}

  //return dom;
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


async function validateUrl(url, settings) {
  // Ensure protocol is set. Use https unless url is localhost or protocol is
  // explicitly set already.
  let remfsUrl;
  if (url.startsWith('http')) {
    remfsUrl = url;
  }
  else {
    if (url.startsWith('localhost')) {
      remfsUrl = 'http://' + url;
    }
    else {
      remfsUrl = 'https://' + url;
    }
  }

  if (settings.filesystems[remfsUrl] !== undefined) {
    alert("Filesystem already exists");
    return;
  }

  try {
    const fetchUrl = remfsUrl + '/remfs.json';
    const response = await fetch(fetchUrl);

    if (response.status !== 200) {
      alert(`Failed retrieving ${fetchUrl}\nStatus Code: ${response.status}`);
      return;
    }
  }
  catch(e) {
    alert("Invalid filesystem. Is it a valid URL?");
    return;
  }

  return remfsUrl;
}


// uses a long-lived token to regularly refresh a global short-lived, read-only
// token. This is useful for things like setting image src URLs for protected
// images.
//async function maintainInsecureToken(rootUrl, secureToken) {
//
//  async function refreshToken() {
//    return fetch(rootUrl + '?pauth-method=dummy&access_token=' + secureToken, {
//      method: 'POST',
//      headers: {
//        'Content-Type': 'application/json',
//      },
//      body: JSON.stringify({
//        method: 'authorize',
//        params: {
//          maxAge: 600,
//          perms: {
//            '/': {
//              read: true,
//            }
//          }
//        },
//      }),
//    })
//    .then(response => {
//      if (response.status !== 200) {
//        alert("failed to refresh token");
//      }
//
//      return response.text();
//    })
//    .then(token => {
//      // Create a temporary link which includes a token, click that link, then
//      // remove it.
//      window.insecureToken = token;
//
//      return token;
//    });
//  }
//
//  await refreshToken();
//
//  // refresh every 9 minutes. Valid for 10 minutes
//  setInterval(async () => {
//    await refreshToken();  
//  }, 540000);
//}


export {
  RemFSDelver,
};
