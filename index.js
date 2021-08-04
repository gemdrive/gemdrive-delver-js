import { parsePath, encodePath, removeAllChildren } from './utils.js';
import { ControlBar } from './components/control_bar.js';
import { DriveList } from './components/drive_list.js';
import { Directory } from './components/directory.js';
import { Progress } from './components/progress.js';
import { showConfirmDialog, showPromptDialog } from './components/dialog.js';


const GemDriveDelver = async (options) => {

  const state = {
    curDriveUri: null,
    curPath: null,
    curDir: null,
    selectedItems: {},
  };

  const dom = document.createElement('div');
  dom.classList.add('gemdrive-delver');

  const controlBar = ControlBar();
  dom.appendChild(controlBar.dom);

  const pageEl = document.createElement('div');
  pageEl.classList.add('gemdrive-delver__dir-container');
  dom.appendChild(pageEl);

  let settings = JSON.parse(localStorage.getItem('settings'));
  if (settings === null) {
    settings = {
      drives: {},
    };
    localStorage.setItem('settings', JSON.stringify(settings));
  }

  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.has('drive') && urlParams.has('path')) {
    navigate(urlParams.get('drive'), parsePath(urlParams.get('path')));
  }

  const driveList = DriveList(settings.drives);
  pageEl.appendChild(driveList.dom);

  pageEl.addEventListener('add-drive', async (e) => {

    const driveUri = e.detail.url;

    const result = await validateUrl(driveUri, settings);

    if (result.err) {
      if (result.err === 403) {
        loginPrompt(result.gemUrl, '/');

        const drive = {};
        settings.drives[result.gemUrl] = drive;
        localStorage.setItem('settings', JSON.stringify(settings));
        driveList.addDrive(result.gemUrl, drive);
      }
      else {
        alert(result.err);
      }
    }
    else {
      const drive = {};
      settings.drives[result.gemUrl] = drive;
      localStorage.setItem('settings', JSON.stringify(settings));

      driveList.addDrive(result.gemUrl, drive);
    }
  });

  controlBar.dom.addEventListener('navigate-back', async (e) => {
    window.history.back();
  });

  controlBar.dom.addEventListener('navigate-up', async (e) => {
    if (state.curPath && state.curPath.length > 0) {
      const parentPath = state.curPath.slice(0, state.curPath.length - 1);
      await navigate(state.curDriveUri, parentPath);
      window.scrollTo(0, 0);
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
    const driveList = DriveList(settings.drives);
    pageEl.appendChild(driveList.dom);
    controlBar.onLocationChange('', []);
    state.curDriveUri = null;
    state.curPath = null;
    state.curDir = null;
    history.pushState(null, '', window.location.pathname);
  }

  controlBar.dom.addEventListener('reload', (e) => {
    navigate(state.curDriveUri, state.curPath);
  });
  
  controlBar.dom.addEventListener('create-directory', async (e) => {
    const dirName = await showPromptDialog("Enter directory name");

    if (dirName) {

      const newDirPath = [...state.curPath, dirName];
      let createDirReqUrl = state.curDriveUri + encodePath(newDirPath) + '/';

      const drive = settings.drives[state.curDriveUri];
      if (drive.accessToken) {
        createDirReqUrl += '?access_token=' + drive.accessToken;
      }

      fetch(createDirReqUrl, {
        method: 'PUT',
      })
      .then(async (response) => {
        if (response.status === 200) {
          navigate(state.curDriveUri, state.curPath);
        }
        else if (response.status === 403) {
          loginPrompt(state.curDriveUri, '/');
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

  pageEl.addEventListener('select-drive', async (e) => {
    const driveUri = e.detail.url;
    await navigate(driveUri, []);
  });

  pageEl.addEventListener('select-dir', async (e) => {
    await navigate(e.detail.driveUri, e.detail.path);
    window.scrollTo(0, 0);
  });

  async function navigate(driveUri, path) {
    await goTo(driveUri, path);
    history.pushState(null, '', window.location.pathname + `?drive=${driveUri}&path=${encodePath(path)}`);
  }

  async function goTo(driveUri, path) {

    state.curDriveUri = driveUri;
    state.curPath = path;

    let drive = settings.drives[driveUri];

    if (!drive) {
      drive = {};
      settings.drives[driveUri] = drive;
      localStorage.setItem('settings', JSON.stringify(settings));
    }

    const gemDataPath = ['gemdrive', 'index', ...path, 'list.json'];
    let gemReqUrl = driveUri + encodePath(gemDataPath);
    if (drive.accessToken) {
      gemReqUrl += '?access_token=' + drive.accessToken;
    }

    const gemDataResponse = await fetch(gemReqUrl);

    if (gemDataResponse.status === 200) {
      const gemData = await gemDataResponse.json();

      // derive directory state from global state
      const dirState = {
        items: {},
      };

      if (state.selectedItems[driveUri]) {
        for (const pathStr in state.selectedItems[driveUri]) {
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

      state.curDir = gemData;
      const dir = Directory(dirState, state.curDir, driveUri, path, drive.accessToken);
      removeAllChildren(pageEl);
      pageEl.appendChild(dir.dom);
      controlBar.onLocationChange(driveUri, path, drive.accessToken);
    }
    else if (gemDataResponse.status === 403) {
      loginPrompt(driveUri, encodePath(path));
    }
  }

  window.onpopstate = (e) => {
    const urlParams = new URLSearchParams(window.location.search);
    const driveUri = urlParams.get('drive');
    const pathStr = urlParams.get('path');

    if (driveUri && pathStr) {
      const path = parsePath(pathStr);
      goTo(driveUri, path);
    }
    else {
      goHome();
    }
  };

  // File uploads
  const uppie = new Uppie();

  const handleFiles = async (e, formData, filenames) => {
    for (const param of formData.entries()) {
      const file = param[1];

      const uploadPath = [...state.curPath, file.name];
      let uploadUrl = state.curDriveUri + encodePath(uploadPath);

      const drive = settings.drives[state.curDriveUri];
      if (drive.accessToken) {
        uploadUrl += '?access_token=' + drive.accessToken;
      }

      const uploadProgress = Progress(file.size);
      pageEl.insertBefore(uploadProgress.dom, pageEl.firstChild);

      const intervalId = setInterval(async () => {
        const res = await fetch(uploadUrl, {
          method: 'HEAD',
        });

        const size = Number(res.headers.get('content-length'));
        uploadProgress.updateCount(size);
      }, 3000);

      await uploadFile(uploadUrl, file);

      clearInterval(intervalId);

      navigate(state.curDriveUri, state.curPath);
    }
  };

  async function uploadFile(uploadUrl, file) {

    const existing = state.curDir.children && state.curDir.children[file.name];

    if (existing) {

      if (existing.size === file.size) {
        const doIt = await showConfirmDialog("File exists and is same size. Overwrite?");
        if (doIt) {

          const urlObj = new URL(uploadUrl);
          urlObj.searchParams.set('overwrite', 'true');
          
          // TODO: need to properly encode params so they don't become part of path
          await fetch(urlObj.href, {
            method: 'PUT',
            body: file,
          });
        }
      }
      else if (existing.size < file.size) {
        const doIt = await showConfirmDialog("File exists but is smaller. Resume?");

        if (doIt) {

          const urlObj = new URL(uploadUrl);
          urlObj.searchParams.set('offset', existing.size);

          await fetch(urlObj.href, {
            method: 'PATCH',
            body: file.slice(existing.size),
          });
        }
      }
    }
    else {
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
      });
    }
  }

  const fileInput = InvisibleFileInput();
  uppie(fileInput, handleFiles);
  dom.appendChild(fileInput);
  
  const folderInput = InvisibleFolderInput();
  uppie(folderInput, handleFiles);
  dom.appendChild(folderInput);

  controlBar.dom.addEventListener('upload', (e) => {
    if (state.curDriveUri) {
      fileInput.click();
    }
  });

  pageEl.addEventListener('item-selected', (e) => {
    const { driveUri, path, item } = e.detail;
    const selectUrl = driveUri + encodePath(path);
    if (!state.selectedItems[driveUri]) {
      state.selectedItems[driveUri] = {};
    }
    state.selectedItems[driveUri][encodePath(path)] = item;
    controlBar.onSelectedItemsChange(state.selectedItems);
  });
  pageEl.addEventListener('item-deselected', (e) => {
    const { driveUri, path } = e.detail;
    delete state.selectedItems[driveUri][encodePath(path)];
    controlBar.onSelectedItemsChange(state.selectedItems);
  });

  controlBar.dom.addEventListener('copy', async (e) => {

    const { numItems, selectedUrls, selectedItems } = buildSelectedUrls(state, settings);

    const doIt = await showConfirmDialog(`Are you sure you want to copy ${numItems} items?`);
    
    if (doIt) {

      const drive = settings.drives[state.curDriveUri];

      for (let i = 0; i < selectedUrls.length; i++) {
        const url = selectedUrls[i];
        const item = selectedItems[i];

        let copyCommandUrl = state.curDriveUri + encodePath(state.curPath) + '?remfs-method=remote-download&url=' + encodeURIComponent(url);
        let sseUrl = state.curDriveUri + encodePath(state.curPath) + '?events=true';

        if (drive.accessToken) {
          copyCommandUrl += '&access_token=' + drive.accessToken;
          sseUrl += '&access_token=' + drive.accessToken;
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
          navigate(state.curDriveUri, state.curPath);
        }
        catch (e) {
          alert("Failed to copy");
        }
      }
    } 
  });

  controlBar.dom.addEventListener('authorize', (e) => {
    loginPrompt(state.curDriveUri, '/');
  });

  controlBar.dom.addEventListener('delete', async (e) => {
    
    const { numItems, selectedUrls } = buildSelectedUrls(state, settings);

    const doIt = await showConfirmDialog(`Are you sure you want to delete ${numItems} items?`);
    
    if (doIt) {
      for (const url of selectedUrls) {
        fetch(url, {
          method: 'DELETE',
        })
        .then(async (response) => {
          if (response.status === 200) {
            state.selectedItems = {};
            controlBar.onSelectedItemsChange(state.selectedItems);
            navigate(state.curDriveUri, state.curPath);
          }
          else if (response.status === 403) {
            loginPrompt(state.curDriveUri, '/');
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

  async function loginPrompt(driveUri, path) {
    const key = await showPromptDialog(`You do not have access to\n${driveUri + path}\nEnter a key to login:`);

    const loginUrl = driveUri + path + `gemdrive/login?access_token=${key}`;

    let res = await fetch(loginUrl, {
      method: 'POST',
      //credentials: 'include',
    });

    if (res.status === 200) {
      const newKey = await res.text();

      settings.drives[driveUri].accessToken = newKey;
      localStorage.setItem('settings', JSON.stringify(settings));
    }
  }

  return dom;
};

function parseGemDataTsv(text) {
  const children = text.split('\n')
    .map(line => line.split('\t'));

  const gemData = {
    type: 'dir',
    children: {},
  };

  for (const child of children) {
    if (child.length !== 3) {
      continue;
    }

    let filename = child[0];
    let type;
    if (filename.endsWith('/')) {
      type = 'dir';
      filename = filename.slice(0, -1);
    }
    else {
      type = 'file';
    }

    const modTime = child[1];
    const size = child[2];
    gemData.children[filename] = {
      type,
      size,
      modTime,
    };
  }

  return gemData;
}

function buildSelectedUrls(state, settings) {
  let numItems = 0;
  const selectedUrls = [];
  const selectedItems = [];

  for (const driveUri in state.selectedItems) {

    const drive = settings.drives[driveUri];

    for (const itemKey in state.selectedItems[driveUri]) {
      numItems += 1;
      let selectedUrl = driveUri + itemKey;
      if (drive.accessToken) {
        selectedUrl += '?access_token=' + drive.accessToken;
      }
      selectedUrls.push(selectedUrl);
      selectedItems.push(state.selectedItems[driveUri][itemKey]);
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
  let gemUrl;
  if (url.startsWith('http')) {
    gemUrl = url;
  }
  else {
    if (url.startsWith('localhost')) {
      gemUrl = 'http://' + url;
    }
    else {
      gemUrl = 'https://' + url;
    }
  }

  if (settings.drives[gemUrl] !== undefined) {
    return { err: "Drive already exists" };
  }

  try {
    const fetchUrl = gemUrl + '/gemdrive/index/list.json';
    const response = await fetch(fetchUrl);

    if (response.status !== 200) {
      return { err: response.status, gemUrl };
    }
  }
  catch(e) {
    return { err: "Invalid drive. Is it a valid URL?" };
  }

  return {
    gemUrl
  };
}


export {
  GemDriveDelver,
};
