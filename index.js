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

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('code') && urlParams.has('fs')) {
    const code = urlParams.get('code');
    urlParams.delete('code');

    history.pushState(null, '', window.location.pathname + '?' + decodeURIComponent(urlParams.toString()));

    const fsUrl = urlParams.get('fs');

    const accessToken = await fetch(fsUrl + '?pauth-method=token&grant_type=authorization_code&code=' + code)
      .then(r => r.text());

    settings.filesystems[fsUrl].accessToken = accessToken;
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
    history.pushState(null, '', window.location.pathname);
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
    const remfsPath = [...path, 'remfs.json'];
    let reqUrl = fsUrl + encodePath(remfsPath);
    if (fs.accessToken) {
      reqUrl += '?access_token=' + fs.accessToken;
    }

    const remfsResponse = await fetch(reqUrl)

    if (remfsResponse.status === 200) {
      const remfsRoot = await remfsResponse.json();
      const curDir = remfsRoot;
      const dir = Directory(remfsRoot, curDir, fsUrl, path, null, fs.accessToken);
      removeAllChildren(pageEl);
      pageEl.appendChild(dir.dom);
      controlBar.onLocationChange(fsUrl, path);

      history.pushState(null, '', window.location.pathname + `?fs=${fsUrl}&path=${encodePath(path)}`);
    }
    else if (remfsResponse.status === 403) {
      const doAuth = confirm("Unauthorized. Do you want to attempt authorization?");

      if (doAuth) {
        authorize(fsUrl);
      }
    }
  }

  // File uploads
  const uppie = new Uppie();

  const handleFiles = async (e, formData, filenames) => {
    for (const param of formData.entries()) {
      const file = param[1];

      const uploadPath = [...curPath, file.name];
      let uploadUrl = curFsUrl + encodePath(uploadPath);

      const fs = settings.filesystems[curFsUrl];
      if (fs.accessToken) {
        uploadUrl += '?access_token=' + fs.accessToken;
      }

      fetch(uploadUrl, {
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
        
        const doAuth = confirm("Unauthorized. Do you want to attempt authorization?");

        if (doAuth) {
          authorize(curFsUrl);
        }
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

  //    dirContainer.addEventListener('item-selected', (e) => {
  //      selectedItems[encodePath(e.detail.path)] = true;
  //      controlBar.onSelectedItemsChange(selectedItems);
  //    });
  //    dirContainer.addEventListener('item-deselected', (e) => {
  //      delete selectedItems[encodePath(e.detail.path)];
  //      controlBar.onSelectedItemsChange(selectedItems);
  //    });
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

function authorize(fsUrl) {
  const clientId = window.location.origin;
  const redirectUri = encodeURIComponent(window.location.href);
  const scope = '/:write';
  window.location.href = fsUrl + `?pauth-method=authorize&response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
}


export {
  RemFSDelver,
};
