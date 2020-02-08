const RemFSDelver = async (options) => {
  const dom = document.createElement('div');
  dom.classList.add('remfs-delver');

  const urlParams = new URLSearchParams(window.location.search);

  let curDir;
  let curPath;
  let remfsRoot;
  let layout = 'list';

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

  // TODO: re-enable control bar once it does something useful.
  //const controlBar = ControlBar();
  //dom.appendChild(controlBar.dom);
  
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

      dirContainer.appendChild(Directory(remfsRoot, curDir, rootUrl, curPath, layout));

      dirContainer.addEventListener('change-dir', (e) => {
        curDir = remfsRoot;
        curPath = e.detail.path;
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
        const newDirEl = Directory(remfsRoot, curDir, rootUrl, curPath, layout)
        dirContainer.replaceChild(newDirEl, dirContainer.childNodes[0]);
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
  dom.classList.add('remfs-delver__control-bar');

  const listIconEl = document.createElement('ion-icon');
  listIconEl.name = 'list';
  listIconEl.addEventListener('click', (e) => {
    dom.dispatchEvent(new CustomEvent('layout-list', {
      bubbles: true,
    }));
  });
  dom.appendChild(listIconEl);
  
  const gridIconEl = document.createElement('ion-icon');
  gridIconEl.name = 'apps';
  gridIconEl.addEventListener('click', (e) => {
    dom.dispatchEvent(new CustomEvent('layout-grid', {
      bubbles: true,
    }));
  });
  dom.appendChild(gridIconEl);

  return { dom };
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
    for (const filename in dir.children) {
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

  return dom;
};

const ListItem = (root, filename, item, rootUrl, path) => {
  const dom = document.createElement('a');
  dom.classList.add('remfs-delver__list-item');
  dom.setAttribute('href', rootUrl + encodePath(path));

  const inner = document.createElement('div');
  inner.classList.add('remfs-delver__list-content');

  if (item.type === 'dir') {
    const iconEl = document.createElement('ion-icon');
    iconEl.name = 'folder';
    inner.appendChild(iconEl);
  }
  else {
    let thumb = false;
    if (isImage(filename) && root.children.thumbnails) {
      let curThumbItem = root.children.thumbnails;

      for (const part of path) {
        if (curThumbItem.children) {
          curThumbItem = curThumbItem.children[part];
        }
        else {
          console.log("thumb not found");
          break;
        }
      }

      if (curThumbItem) {
        thumb = true;
      }
    }

    if (thumb) {
      const thumbEl = document.createElement('img');
      thumbEl.classList.add('remfs-delver__thumb');

      thumbEl.src = rootUrl + '/thumbnails' + encodePath(path);
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
