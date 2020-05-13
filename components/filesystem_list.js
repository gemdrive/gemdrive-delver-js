import { AddFilesystem } from './add_filesystem.js';


export const FilesystemList = (filesystems) => {
  const dom = document.createElement('div');
  dom.classList.add('remfs-delver-filesystems-list');

  const header = document.createElement('h1');
  header.innerText = "Filesystems:";
  dom.appendChild(header);

  for (const key in filesystems) {
    const filesystem = filesystems[key];
    appendFilesystem(key, filesystem);
  }

  function appendFilesystem(url, filesystem) {
    const filesystemEl = document.createElement('div');
    filesystemEl.classList.add('remfs-delver__list-content');
    filesystemEl.innerText = url;
    filesystemEl.addEventListener('click', (e) => {
      dom.dispatchEvent(new CustomEvent('select-filesystem', {
        bubbles: true,
        detail: {
          url,
        },
      }));
    });
    dom.appendChild(filesystemEl);
  }

  const addFilesystemBtn = document.createElement('button');
  addFilesystemBtn.innerText = "Add Filesystem";
  dom.appendChild(addFilesystemBtn);

  const addFilesystemEl = AddFilesystem();
  addFilesystemEl.addEventListener('cancel-add-filesystem', () => {
    dom.removeChild(addFilesystemEl);
    dom.appendChild(addFilesystemBtn);
  });

  addFilesystemBtn.addEventListener('click', (e) => {
    dom.removeChild(addFilesystemBtn);
    dom.appendChild(addFilesystemEl);
  });

  function addFilesystem(url, filesystem) {
    dom.removeChild(addFilesystemEl);
    appendFilesystem(url, filesystem);
    dom.appendChild(addFilesystemBtn);
  }

  return {
    dom,
    addFilesystem
  };
};
