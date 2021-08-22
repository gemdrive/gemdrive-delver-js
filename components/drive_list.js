import { AddDrive } from './add_drive.js';
import { Button } from './common.js';


export const DriveList = (drives) => {
  const dom = document.createElement('div');
  dom.classList.add('gemdrive-delver-drives-list');

  const header = document.createElement('h1');
  //header.innerText = "Drives:";
  //
  const driveElMap = {};
  dom.appendChild(header);

  for (const key in drives) {
    const drive = drives[key];
    appendDrive(key, drive);
  }

  function appendDrive(url, drives) {
    const driveEl = document.createElement('div');
    driveEl.classList.add('gemdrive-delver__list-content', 'gemdrive-delver__drive-list');
    driveEl.innerText = url;
    driveEl.addEventListener('click', (e) => {
      dom.dispatchEvent(new CustomEvent('select-drive', {
        bubbles: true,
        detail: {
          url,
        },
      }));
    });

    const removeButtonEl = Button("Remove");
    driveEl.appendChild(removeButtonEl);
    removeButtonEl.addEventListener('click', (e) => {
      e.stopPropagation();

      dom.dispatchEvent(new CustomEvent('remove-drive', {
        bubbles: true,
        detail: {
          url,
        },
      }));
    });


    dom.appendChild(driveEl);
    driveElMap[url] = driveEl;
  }

  const addDriveBtn = Button("Add Drive");
  dom.appendChild(addDriveBtn);

  const addDriveEl = AddDrive();
  addDriveEl.addEventListener('cancel-add-drive', () => {
    dom.removeChild(addDriveEl);
    dom.appendChild(addDriveBtn);
  });

  addDriveBtn.addEventListener('click', (e) => {
    dom.removeChild(addDriveBtn);
    dom.appendChild(addDriveEl);
  });

  function addDrive(url, drive) {
    dom.removeChild(addDriveEl);
    appendDrive(url, drive);
    dom.appendChild(addDriveBtn);
  }

  function removeDrive(url) {
    dom.removeChild(driveElMap[url]);
  }

  return {
    dom,
    addDrive,
    removeDrive,
  };
};
