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

  
  render();

  async function render() {

    const remfsResponse = await fetch(rootUrl + '/remfs.json', {
      headers: {
        'Remfs-Token': localStorage.getItem('remfs-token'),
      },
    })

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
      dirContainer.appendChild(dir.dom);

      dirContainer.addEventListener('change-dir', (e) => {
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

      function updateDirEl() {
        const newDir = Directory(remfsRoot, curDir, rootUrl, curPath, layout)
        onAddChild = newDir.onAddChild;
        dirContainer.replaceChild(newDir.dom, dirContainer.childNodes[0]);
      }
    }
    else if (remfsResponse.status === 403) {
      const loginEl = LoginView(rootUrl);
      loginEl.addEventListener('authorized', (e) => {
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
          method: 'authorize',
          params: {
            email: emailEl.value,
            perms: {
              "/": {
                write: true,
              },
            },
          }
        }),
      })
      .then(response => {
        console.log(response);
        if (response.status !== 200) {
          throw new Error("Authorization failed");
        }

        return response.text();
      })
      .then(token => {
        dom.dispatchEvent(new CustomEvent('authorized', {
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
    return fetch(rootUrl + '?token=' + secureToken, {
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
