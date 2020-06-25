import { parsePath, encodePath, removeAllChildren } from './utils.js';
import { ControlBar } from './components/control_bar.js';
import { FilesystemList } from './components/filesystem_list.js';
import { Directory } from './components/directory.js';
import { Progress } from './components/progress.js';


const RemFSDelver = async (options) => {

  const state = {
    curFsUrl: null,
    curPath: null,
    selectedItems: {},
  };

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
  if (urlParams.has('code') && urlParams.has('state')) {

    const { accessToken, state } = await window.gemdriveAuthClient.completeAuthorization();

    const fsUrl = state;
    if (!settings.filesystems[fsUrl]) {
      settings.filesystems[fsUrl] = {};
    }
    settings.filesystems[fsUrl].accessToken = accessToken;
    localStorage.setItem('settings', JSON.stringify(settings));
  }

  if (urlParams.has('fs') && urlParams.has('path')) {
    navigate(urlParams.get('fs'), parsePath(urlParams.get('path')));
  }

  const fsList = FilesystemList(settings.filesystems);
  pageEl.appendChild(fsList.dom);

  pageEl.addEventListener('add-filesystem', async (e) => {

    const fsUrl = e.detail.url;

    const result = await validateUrl(fsUrl, settings);

    if (result.err) {
      if (result.err === 403) {
        const doAuth = confirm("Unauthorized. Do you want to attempt authorization?");

        if (doAuth) {
          authorize(result.remfsUrl);
        }
      }
      else {
        alert(result.err);
      }
    }
    else {
      const filesystem = {};
      settings.filesystems[result.remfsUrl] = filesystem;
      localStorage.setItem('settings', JSON.stringify(settings));

      fsList.addFilesystem(result.remfsUrl, filesystem);
    }
  });

  controlBar.dom.addEventListener('navigate-up', async (e) => {
    if (state.curPath && state.curPath.length > 0) {
      const parentPath = state.curPath.slice(0, state.curPath.length - 1);
      await navigate(state.curFsUrl, parentPath);
    }
    else {
      goHome();
    }
  });

  controlBar.dom.addEventListener('go-to-your-home', (e) => {
    goHome();
  });

  function goHome() {
    removeAllChildren(pageEl);
    const fsList = FilesystemList(settings.filesystems);
    pageEl.appendChild(fsList.dom);
    controlBar.onLocationChange('', []);
    state.curFsUrl = null;
    state.curPath = null;
    history.pushState(null, '', window.location.pathname);
  }

  controlBar.dom.addEventListener('reload', (e) => {
    navigate(state.curFsUrl, state.curPath);
  });
  
  controlBar.dom.addEventListener('create-directory', (e) => {
    const dirName = prompt("Enter directory name");

    if (dirName) {

      const newDirPath = [...state.curPath, dirName];
      let createDirReqUrl = state.curFsUrl + encodePath(newDirPath) + '/';

      const fs = settings.filesystems[state.curFsUrl];
      if (fs.accessToken) {
        createDirReqUrl += '?access_token=' + fs.accessToken;
      }

      fetch(createDirReqUrl, {
        method: 'PUT',
      })
      .then((response) => {
        if (response.status === 200) {
          navigate(state.curFsUrl, state.curPath);
        }
        else if (response.status === 403) {
          const doAuth = confirm("Unauthorized to create. Do you want to attempt authorization?");

          if (doAuth) {
            authorize(state.curFsUrl);
          }
        }
        else {
          alert("Creating directory failed for unknown reason.");
        }
      })
      .catch((e) => {
        console.error(e);
      });
    }
  });

  pageEl.addEventListener('select-filesystem', async (e) => {
    const fsUrl = e.detail.url;
    await navigate(fsUrl, []);
  });

  pageEl.addEventListener('select-dir', async (e) => {
    await navigate(e.detail.fsUrl, e.detail.path);
  });

  async function navigate(fsUrl, path) {

    state.curFsUrl = fsUrl;
    state.curPath = path;

    let fs = settings.filesystems[fsUrl];

    if (!fs) {
      fs = {};
      settings.filesystems[fsUrl] = fs;
      localStorage.setItem('settings', JSON.stringify(settings));
    }

    const remfsPath = [...path, 'remfs.json'];
    let reqUrl = fsUrl + encodePath(remfsPath);
    if (fs.accessToken) {
      reqUrl += '?access_token=' + fs.accessToken;
    }

    const remfsResponse = await fetch(reqUrl)

    if (remfsResponse.status === 200) {
      const remfsRoot = await remfsResponse.json();

      // derive directory state from global state
      const dirState = {
        items: {},
      };

      if (state.selectedItems[fsUrl]) {
        for (const pathStr in state.selectedItems[fsUrl]) {
          const selPath = parsePath(pathStr);
          const selFilename = selPath[selPath.length - 1];
          const selPathParent = selPath.slice(0, selPath.length - 1);
          if (encodePath(path) === encodePath(selPathParent)) {
            dirState.items[selFilename] = {
              selected: true,
            };
          }
        }
      }

      const curDir = remfsRoot;
      const dir = Directory(dirState, remfsRoot, curDir, fsUrl, path, fs.accessToken);
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

  //window.onpopstate = (e) => {
  //  const urlParams = new URLSearchParams(window.location.search);
  //  const fsUrl = urlParams.get('fs');
  //  const path = parsePath(urlParams.get('path'));
  //  console.log(fsUrl, path);
  //  navigate(fsUrl, path);
  //};

  // File uploads
  const uppie = new Uppie();

  const handleFiles = async (e, formData, filenames) => {
    for (const param of formData.entries()) {
      const file = param[1];

      const uploadPath = [...state.curPath, file.name];
      let uploadUrl = state.curFsUrl + encodePath(uploadPath);

      let sseUrl = uploadUrl + '?events=true';

      const fs = settings.filesystems[state.curFsUrl];
      if (fs.accessToken) {
        uploadUrl += '?access_token=' + fs.accessToken;
        sseUrl += '&access_token=' + fs.accessToken;
      }

      const uploadProgress = Progress(file.size);
      pageEl.insertBefore(uploadProgress.dom, pageEl.firstChild);

      const sse = new EventSource(sseUrl); 
      sse.addEventListener('update', (e) => {
        const event = JSON.parse(e.data);
        uploadProgress.updateCount(event.remfs.size);

        if (event.type === 'complete') {
          sse.close();
        }
      });

      fetch(uploadUrl, {
        method: 'PUT',
        body: file,
      })
      .then(response => {
        if (response.status === 403) {
          const doAuth = confirm("Unauthorized. Do you want to attempt authorization?");

          if (doAuth) {
            authorize(state.curFsUrl);
          }
        }
        else {
          return response.json()
        }
      })
      .then(remfs => {
        // TODO: This is a hack. Will probably need to dynamically update
        // at some point.
        navigate(state.curFsUrl, state.curPath);
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
    if (state.curFsUrl) {
      fileInput.click();
    }
  });

  pageEl.addEventListener('item-selected', (e) => {
    const { fsUrl, path, item } = e.detail;
    const selectUrl = fsUrl + encodePath(path);
    if (!state.selectedItems[fsUrl]) {
      state.selectedItems[fsUrl] = {};
    }
    state.selectedItems[fsUrl][encodePath(path)] = item;
    controlBar.onSelectedItemsChange(state.selectedItems);
  });
  pageEl.addEventListener('item-deselected', (e) => {
    const { fsUrl, path } = e.detail;
    delete state.selectedItems[fsUrl][encodePath(path)];
    controlBar.onSelectedItemsChange(state.selectedItems);
  });

  controlBar.dom.addEventListener('copy', async (e) => {

    const { numItems, selectedUrls, selectedItems } = buildSelectedUrls(state, settings);

    const doIt = confirm(`Are you sure you want to copy ${numItems} items?`);
    
    if (doIt) {

      const fs = settings.filesystems[state.curFsUrl];

      for (let i = 0; i < selectedUrls.length; i++) {
        const url = selectedUrls[i];
        const item = selectedItems[i];

        let copyCommandUrl = state.curFsUrl + encodePath(state.curPath) + '?remfs-method=remote-download&url=' + encodeURIComponent(url);
        let sseUrl = state.curFsUrl + encodePath(state.curPath) + '?events=true';

        if (fs.accessToken) {
          copyCommandUrl += '&access_token=' + fs.accessToken;
          sseUrl += '&access_token=' + fs.accessToken;
        }

        const progress = Progress(item.size);
        pageEl.insertBefore(progress.dom, pageEl.firstChild);

        const sse = new EventSource(sseUrl); 
        sse.addEventListener('update', (e) => {
          const event = JSON.parse(e.data);
          progress.updateCount(event.remfs.size);

          if (event.type === 'complete') {
            sse.close();
          }
        });

        try {
          await fetch(copyCommandUrl)
          state.selectedItems = {};
          controlBar.onSelectedItemsChange(state.selectedItems);
          navigate(state.curFsUrl, state.curPath);
        }
        catch (e) {
          alert("Failed to copy");
        }
      }
    } 
  });

  controlBar.dom.addEventListener('authorize', (e) => {
    authorize(state.curFsUrl);
  });

  controlBar.dom.addEventListener('delete', (e) => {
    
    const { numItems, selectedUrls } = buildSelectedUrls(state, settings);

    const doIt = confirm(`Are you sure you want to delete ${numItems} items?`);
    
    if (doIt) {
      for (const url of selectedUrls) {
        fetch(url, {
          method: 'DELETE',
        })
        .then((response) => {
          if (response.status === 200) {
            state.selectedItems = {};
            controlBar.onSelectedItemsChange(state.selectedItems);
            navigate(state.curFsUrl, state.curPath);
          }
          else if (response.status === 403) {
            const doAuth = confirm("Unauthorized to delete. Do you want to attempt authorization?");

            if (doAuth) {
              authorize(state.curFsUrl);
            }
          }
          else {
            alert("Failed delete for unknown reason.");
          }
        })
        .catch((e) => {
          console.error(e);
        });
      }
    }
  });

  return dom;
};

function buildSelectedUrls(state, settings) {
  let numItems = 0;
  const selectedUrls = [];
  const selectedItems = [];

  for (const fsUrl in state.selectedItems) {

    const fs = settings.filesystems[fsUrl];

    for (const itemKey in state.selectedItems[fsUrl]) {
      numItems += 1;
      let selectedUrl = fsUrl + itemKey;
      if (fs.accessToken) {
        selectedUrl += '?access_token=' + fs.accessToken;
      }
      selectedUrls.push(selectedUrl);
      selectedItems.push(state.selectedItems[fsUrl][itemKey]);
    }
  }

  return { numItems, selectedUrls, selectedItems };
}


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
    return { err: "Filesystem already exists" };
  }

  try {
    const fetchUrl = remfsUrl + '/remfs.json';
    const response = await fetch(fetchUrl);

    if (response.status !== 200) {
      return { err: response.status, remfsUrl };
    }
  }
  catch(e) {
    return { err: "Invalid filesystem. Is it a valid URL?" };
  }

  return {
    remfsUrl
  };
}

async function authorize(fsUrl) {
  return window.gemdriveAuthClient.authorize({
    driveUri: fsUrl,
    perms: [
      {
        type: 'dir',
        perm: 'write',
        path: '/',
      }
    ],
    state: fsUrl,
  });
}


export {
  RemFSDelver,
};
