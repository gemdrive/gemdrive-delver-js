import { encodePath, removeAllChildren } from '../utils.js';
import { OpenExternalButton } from './directory.js';


export const ControlBar = () => {
  const dom = document.createElement('div');
  dom.classList.add('gemdrive-delver-control-bar');

  const btnContainerEl = document.createElement('div');
  btnContainerEl.classList.add('gemdrive-delver-control-bar__buttons');
  dom.appendChild(btnContainerEl);

  const locationEl = document.createElement('span');
  locationEl.classList.add('gemdrive-delver-control-bar__location');
  dom.appendChild(locationEl);

  const curDriveEl = document.createElement('span');
  curDriveEl.classList.add('gemdrive-delver-control-bar__drive-url');
  curDriveEl.innerText = "[]";
  locationEl.appendChild(curDriveEl);

  const curPathEl = document.createElement('span');
  curPathEl.classList.add('gemdrive-delver-control-bar__path');
  curPathEl.innerText = "/";
  locationEl.appendChild(curPathEl);


  const backBtnEl = document.createElement('ion-icon');
  backBtnEl.classList.add('gemdrive-delver-icon-button');
  btnContainerEl.appendChild(backBtnEl);
  backBtnEl.name = 'arrow-back-outline';
  backBtnEl.addEventListener('click', (e) => {
    dom.dispatchEvent(new CustomEvent('navigate-back', {
      bubbles: true,
    }));
  });

  const upBtnEl = document.createElement('ion-icon');
  upBtnEl.classList.add('gemdrive-delver-icon-button');
  btnContainerEl.appendChild(upBtnEl);
  upBtnEl.name = 'arrow-up-outline';
  upBtnEl.addEventListener('click', (e) => {
    dom.dispatchEvent(new CustomEvent('navigate-up', {
      bubbles: true,
    }));
  });

  const homeBtnEl = document.createElement('ion-icon');
  homeBtnEl.classList.add('gemdrive-delver-icon-button');
  btnContainerEl.appendChild(homeBtnEl);
  homeBtnEl.name = 'home';
  homeBtnEl.addEventListener('click', (e) => {
    dom.dispatchEvent(new CustomEvent('go-to-your-home', {
      bubbles: true,
    }));
  });

  //const reloadBtnEl = document.createElement('ion-icon');
  //reloadBtnEl.classList.add('gemdrive-delver-icon-button');
  //btnContainerEl.appendChild(reloadBtnEl);
  //reloadBtnEl.name = 'refresh-circle';
  //reloadBtnEl.addEventListener('click', (e) => {
  //  dom.dispatchEvent(new CustomEvent('reload', {
  //    bubbles: true,
  //  }));
  //});

  //const authBtnEl = document.createElement('ion-icon');
  //authBtnEl.classList.add('gemdrive-delver-icon-button');
  //btnContainerEl.appendChild(authBtnEl);
  //authBtnEl.name = 'key';
  //authBtnEl.addEventListener('click', (e) => {
  //  dom.dispatchEvent(new CustomEvent('authorize', {
  //    bubbles: true,
  //  }));
  //});

  const uploadBtnEl = document.createElement('ion-icon');
  uploadBtnEl.classList.add('gemdrive-delver-icon-button');
  uploadBtnEl.name = 'cloud-upload';
  uploadBtnEl.addEventListener('click', (e) => {
    dom.dispatchEvent(new CustomEvent('upload', {
      bubbles: true,
    }));
  });
  btnContainerEl.appendChild(uploadBtnEl);

  const newDirBtnEl = document.createElement('ion-icon');
  newDirBtnEl.classList.add('gemdrive-delver-icon-button');
  newDirBtnEl.name = 'add-circle';
  newDirBtnEl.addEventListener('click', (e) => {
    dom.dispatchEvent(new CustomEvent('create-directory', {
      bubbles: true,
    }));
  });
  btnContainerEl.appendChild(newDirBtnEl);

  const copyBtnContainerEl = document.createElement('span');
  btnContainerEl.appendChild(copyBtnContainerEl);

  const copyBtnEl = document.createElement('ion-icon');
  copyBtnEl.classList.add('gemdrive-delver-icon-button');
  copyBtnEl.name = 'copy';
  copyBtnEl.addEventListener('click', (e) => {
    dom.dispatchEvent(new CustomEvent('copy', {
      bubbles: true,
    }));
  });

  const deleteBtnContainerEl = document.createElement('span');
  btnContainerEl.appendChild(deleteBtnContainerEl);

  const deleteBtnEl = document.createElement('ion-icon');
  deleteBtnEl.classList.add('gemdrive-delver-icon-button');
  deleteBtnEl.name = 'close-circle';
  deleteBtnEl.addEventListener('click', (e) => {
    dom.dispatchEvent(new CustomEvent('delete', {
      bubbles: true,
    }));
  });

  const openExtBtnContainerEl = document.createElement('span');
  btnContainerEl.appendChild(openExtBtnContainerEl);

  function onLocationChange(driveUri, path, accessToken) {
    curDriveEl.innerText = '[' + driveUri + ']';

    const pathStr = encodePath(path);
    curPathEl.innerText = pathStr;

    if (openExtBtnContainerEl.firstChild) {
      openExtBtnContainerEl.removeChild(openExtBtnContainerEl.firstChild);
    }

    if (driveUri.length > 0) {
      openExtBtnContainerEl.appendChild(OpenExternalButton(driveUri, encodePath(path) + '/', accessToken));
    }
  }

  function onSelectedItemsChange(selectedItems) {
    let numItems = 0;
    for (const itemUrl in selectedItems) {
      numItems += Object.keys(selectedItems[itemUrl]).length;
    }

    if (numItems === 0) {
      removeAllChildren(deleteBtnContainerEl);
      removeAllChildren(copyBtnContainerEl);
    }
    else if (deleteBtnContainerEl.childNodes.length === 0) {
      deleteBtnContainerEl.appendChild(deleteBtnEl);
      copyBtnContainerEl.appendChild(copyBtnEl);
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

  return { dom, onLocationChange, onSelectedItemsChange };
};
